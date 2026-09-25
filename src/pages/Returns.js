// src/pages/Returns.js

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchServerItems,
  loadCustomItems,
  saveCustomItems,
} from "./monitor/branches/_shared/ProductPicker";
import ReturnNoteScanner from "./shared/ReturnNoteScanner";
import ReturnNoteImport from "./shared/ReturnNoteImport";
import CodeSuggest from "./shared/CodeSuggest";
import { fetchFiledDates, rememberFiledDate, subscribeFiledDates } from "../utils/filedDates";
import { uploadImage, deleteImage, thumbUrl } from "../utils/imageUpload";
import { API_BASE as SHARED_API_BASE } from "../config/api";

/* ========= API BASE =========
   One resolution order for the whole app lives in src/config/api.js. It is
   re-exported under the old name so nothing that reads it from here changes. */
export const API_BASE = SHARED_API_BASE;

/* ========= Constants ========= */
const BRANCHES = [
  "QCS",
  "POS 6",
  "POS 7",
  "POS 10",
  "POS 11",
  "POS 14",
  "POS 15",
  "POS 16",
  "POS 17",
  "POS 18",
  "POS 19",
  "POS 21",
  "POS 24",
  "POS 25",
  "POS 26",
  "POS 31",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37",
  "POS 38",
  "POS 41",
  "POS 42",
  "FTR 1",
  "FTR 2",
  "KMC",
  "KPS",
  "W K C",   // ✅ NEW
  "POS 43",
  "POS 44",
  "POS 45",
  "POS 47",
  "POS 48",
  "فرع آخر... / Other branch",
];

const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Condemnation / Cooking",
  "Use in kitchen",
  "Send to market",
  "Return to stock",
  "Disposed",
  "Separated expired shelf",
  "Other...",
];

/* Every action carries its own colour, mark and rail, so a scan down the
   ACTION column reads as a picture instead of a wall of identical grey boxes:
   what went back to production, what went in the bin, what went to the
   kitchen. The two bin colours (red, orange) are deliberately the loudest -
   they are the rows an auditor stops at - and the mark is glued to the option
   label, so a closed dropdown still says which family the row belongs to. */
const ACTION_STYLE = {
  "Use in production":        { mark: "♻️", ink: "#3730a3", bg: "#eef2ff", line: "#6366f1" },
  "Condemnation":             { mark: "⛔", ink: "#991b1b", bg: "#fef2f2", line: "#ef4444" },
  "Condemnation / Cooking":   { mark: "🔥", ink: "#9a3412", bg: "#fff7ed", line: "#f97316" },
  "Use in kitchen":           { mark: "🍳", ink: "#854d0e", bg: "#fefce8", line: "#eab308" },
  "Send to market":           { mark: "🏪", ink: "#075985", bg: "#f0f9ff", line: "#0ea5e9" },
  "Return to stock":          { mark: "🔁", ink: "#065f46", bg: "#ecfdf5", line: "#10b981" },
  "Disposed":                 { mark: "🗑️", ink: "#334155", bg: "#f1f5f9", line: "#64748b" },
  "Separated expired shelf":  { mark: "📦", ink: "#6b21a8", bg: "#faf5ff", line: "#a855f7" },
  "Other...":                 { mark: "✏️", ink: "#9d174d", bg: "#fdf2f8", line: "#ec4899" },
};
/* A row with no action yet keeps the ordinary box: the colouring states what
   was answered, it never nudges towards an answer. */
const NO_ACTION_STYLE = { mark: "", ink: "#0f172a", bg: "", line: "" };
const actionStyle = (a) => ACTION_STYLE[String(a || "").trim()] || NO_ACTION_STYLE;

/* The finished-row wash. One constant, because the same stops are re-stated
   in the hover rule and in the completion flash inside RET_CSS, and a row
   that changed colour under the mouse would read as un-finishing itself. */
const DONE_ROW_BG = "linear-gradient(90deg, #dcfce7 0%, #f0fdf7 42%, #ffffff 100%)";

/* An action that ends in the bin has to say WHY - a condemned return with no
   reason on it is the one row an auditor always stops at, and the reason is
   never recoverable later. "Condemnation / Cooking" counts too: the meat is
   still condemned, cooking is only how it leaves. */
const CONDEMN_ACTIONS = ["Condemnation", "Condemnation / Cooking"];
const isCondemnation = (action) =>
  CONDEMN_ACTIONS.some((a) => a.toLowerCase() === String(action || "").trim().toLowerCase());

/* What each save error is called when it is read back to someone. */
const SAVE_FIELD_LABEL = {
  itemCode: "Code",
  butchery: "Branch",
  quantity: "Qty",
  action: "Action",
  remarks: "Remarks (required for condemnation)",
};

const QTY_TYPES = ["KG", "PCS", "PLATE", "أخرى / Other"];

/* REMARKS is picked from a list now, but it is still STORED as a plain
   comma-separated string: BrowseReturns' filters and every Excel/PDF exporter
   read `remarks` as text, and old records already hold free typing. So the
   picker only builds that same string - one row can carry several remarks.

   The list reads in severity order and keeps a light grade next to the heavy
   one it belongs to (MILD SMELL before BAD SMELL, MILD CRITICAL before
   CRITICAL), so whoever picks sees the two steps of the same defect together.
   Never re-spell a value already in use: saved reports hold these exact
   words and the filters and exporters read them as text. */
const REMARK_OPTIONS = [
  "EXPIRED",
  "NEAR EXP",
  "MILD SMELL",
  "BAD SMELL",
  "DAMAGE",
  "MILD CRITICAL",
  "CRITICAL",
];

const splitRemarks = (v) =>
  String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const joinRemarks = (list) => list.join(", ");

const ORIGINS = ["AUS", "S.A", "BRZ", "NEZ", "LOCAL", "IND", "PAK", "IRAN", "KAZ"];

/* The catalog carries the ERP unit of measure. KG, PIECES and PLATE are the
   three we have as real options; anything else (LITRE, BOX, CTN…) keeps its own
   name in the custom field. */
const UOM_TO_QTY = { KG: "KG", PIECES: "PCS", PCS: "PCS", PLATE: "PLATE" };
function qtyTypeFromUom(uom) {
  const u = String(uom || "").trim().toUpperCase();
  if (!u) return null;
  if (UOM_TO_QTY[u]) return { qtyType: UOM_TO_QTY[u], customQtyType: "" };
  return { qtyType: OTHER_QTY, customQtyType: u };
}

/* The optional half of an imported line: everything past the item code, the
   branch and the weight. Each field is mapped onto the value the matching
   dropdown actually offers, and a field that maps to nothing is LEFT OUT of
   the patch entirely rather than written as an empty string - the catalog has
   already filled some of these, and an import must not blank them.

   `hit` is the catalog item the code matched, so the unit it carries can be
   overridden by a unit stated on the paper without losing the rest. */
function extraFromEntry(entry = {}, hit = null) {
  const out = {};

  const unit = String(entry.unit || "").trim();
  if (unit) {
    const q = qtyTypeFromUom(unit);
    if (q) {
      out.qtyType = q.qtyType;
      out.customQtyType = q.customQtyType;
    }
  }

  // the expiry cell is <input type="date"> - anything else it cannot show
  const expiry = String(entry.expiry || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiry)) out.expiry = expiry;

  /* REMARKS stays a comma-separated string (see REMARK_OPTIONS above). Known
     remarks are snapped to the exact spelling the picker uses so the chips
     light up; anything else is kept as typed, which the field has always
     allowed. */
  const remarks = splitRemarks(entry.remarks).map((r) => {
    const m = REMARK_OPTIONS.find((o) => o.toLowerCase() === r.toLowerCase());
    return m || r;
  });
  if (remarks.length) out.remarks = joinRemarks(remarks);

  const action = String(entry.action || "").trim();
  if (action) {
    const known = ACTIONS.find((a) => a.toLowerCase() === action.toLowerCase());
    if (known) out.action = known;
    else {
      out.action = "Other...";
      out.customAction = action;
    }
  }

  /* ORIGIN is a closed list. A value outside it would be written into a select
     that cannot display it, so the catalog's own origin is left standing. */
  const origin = String(entry.origin || "").trim().toUpperCase();
  if (origin && ORIGINS.includes(origin) && (!hit || !hit.origin)) out.origin = origin;

  return out;
}

/* These two strings are the values stored inside saved reports — never change them.
   Only the label shown in the dropdown is English. */
const OTHER_BRANCH = "فرع آخر... / Other branch";
const OTHER_QTY = "أخرى / Other";
const enLabel = (v) =>
  v === OTHER_BRANCH ? "Other branch…" : v === OTHER_QTY ? "Other" : v;

/* Two rows count as the same branch when the branch matches - and, for
   "Other branch", the typed name too. Used to spread one transfer number
   across every row of that branch in the day being entered. */
const branchKeyOf = (r) => {
  const b = String(r?.butchery || "").trim();
  if (!b) return "";
  return b === OTHER_BRANCH
    ? `other:${String(r?.customButchery || "").trim().toLowerCase()}`
    : b;
};
// Password gate moved to server-side validation — no hardcoded credentials in client

/* ===== Excel paste =====
   Copying a block of cells puts TSV on the clipboard: cells split by TAB, rows
   by newline, and any cell that itself contains a tab, a newline or a quote is
   wrapped in double quotes with "" for a literal quote. Excel, LibreOffice,
   Google Sheets and Odoo all write that same shape.

   Only the first two columns are read: the item code, and the quantity if a
   second column is there. That is what a returns paste is - the rest of the row
   (branch, transfer no, action) is one value repeated down the block, which
   Ctrl+D fills far faster than a paste could. */
function parseClipboardTable(text) {
  const src = String(text || "").replace(/\r\n?/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") { quoted = true; continue; }
    if (ch === "\t") { row.push(cell); cell = ""; continue; }
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  row.push(cell);
  rows.push(row);

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
}

/** The number inside a pasted cell: tolerates "12,5", "3.20 KG", "1 234.5". */
function numberFromCell(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const cleaned = raw
    .replace(/[\s ]/g, "")
    .replace(/[^\d.,-]/g, "")
    // a lone comma is a decimal separator here; with a dot present it is a
    // thousands separator and goes away
    .replace(/,(?=[^,]*\.)/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

/* ===== Smart row selection =====
   Turns "10-20, 25, 30-32" typed by hand into a set of 0-based row indexes.
   The SL.NO the user reads is 1-based, so a "10" means row index 9. A range
   may be written with a dash, dots, "to" or the Arabic الى/إلى, and a reversed
   range (20-10) is taken the right way round. Numbers outside the table are
   dropped silently - a range that overshoots the last row just stops there. */
function parseRowRanges(text, count) {
  const nums = new Set();
  String(text || "")
    .split(/[,،]/) // comma or Arabic comma
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((part) => {
      const m = part.match(/^(\d+)\s*(?:-|–|—|\.\.+|to|إلى|الى|ل)\s*(\d+)$/i);
      if (m) {
        let a = parseInt(m[1], 10);
        let b = parseInt(m[2], 10);
        if (a > b) [a, b] = [b, a];
        for (let n = a; n <= b; n++) nums.add(n);
      } else if (/^\d+$/.test(part)) {
        nums.add(parseInt(part, 10));
      }
    });

  const idx = new Set();
  nums.forEach((n) => {
    const i = n - 1;
    if (i >= 0 && i < count) idx.add(i);
  });
  return idx;
}

/* ========= Draft storage key ========= */
const DRAFT_KEY = "returns_draft_v1";
const DRAFT_DATE_KEY = "returns_draft_date_v1";
const DRAFT_SIGN_KEY = "returns_draft_sign_v1";

/* ═════════════════════ Document control ═════════════════════
   This sheet is a controlled QA record, not a scratch table, so it carries the
   same document block its Excel backup prints - see the addDocHeader call in
   settings/excel-exporters/returns.js. The two must be changed together or the
   screen and the file stop being one document.

   English only: this page is an English/LTR form and stays one language. */
const DOC = {
  company: "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
  brand: "AL MAWASHI",
  title: "Returns Report",
  no: "RTN-QM/REC/001",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA / Logistics",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};

/** Whoever is signed in on this browser, used to propose the "Checked by" name. */
function signedInName() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return String(u.name || u.fullName || u.username || "").trim();
  } catch {
    return "";
  }
}

/* ========= Helpers ========= */
function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}
/** Returns true if a row has any meaningful data entered */
function rowHasData(r) {
  return !!(
    r.itemCode ||
    r.productName ||
    r.origin ||
    r.butchery ||
    r.transferNo ||
    r.customButchery ||
    r.expiry ||
    r.remarks ||
    r.action ||
    r.customAction ||
    (r.images?.length || 0) > 0 ||
    r.quantity !== ""
  );
}

/* Every box on a row that is meant to carry a value, and how to tell whether
   it has one. IMAGES and REMARKS are deliberately absent - most returns need
   no photo and most need no remark, and a row that is otherwise complete must
   not be held open, or painted as unfinished, by an optional box.

   This is a COMPLETENESS check, not the save rule: `validateBeforeSave` still
   decides what blocks a save (code, branch, quantity, action). This paints the
   table so a full row can be seen at a glance and a half-typed one says which
   box it is waiting for - the two are kept apart on purpose, so tightening the
   colouring can never quietly start rejecting reports. */
const ROW_FIELDS = {
  itemCode: (r) => !!String(r.itemCode || "").trim(),
  productName: (r) => !!String(r.productName || "").trim(),
  origin: (r) => !!String(r.origin || "").trim(),
  // "Other branch" is only answered once the name beside it is typed
  butchery: (r) =>
    r.butchery === OTHER_BRANCH
      ? !!String(r.customButchery || "").trim()
      : !!String(r.butchery || "").trim(),
  transferNo: (r) => !!String(r.transferNo || "").trim(),
  quantity: (r) => Number.isFinite(Number(r.quantity)) && String(r.quantity).trim() !== "" && Number(r.quantity) > 0,
  qtyType: (r) =>
    r.qtyType === OTHER_QTY ? !!String(r.customQtyType || "").trim() : !!String(r.qtyType || "").trim(),
  expiry: (r) => !!String(r.expiry || "").trim(),
  // free on any other action, required the moment the row says "condemned"
  remarks: (r) => !isCondemnation(r.action) || !!String(r.remarks || "").trim(),
  action: (r) =>
    r.action === "Other..." ? !!String(r.customAction || "").trim() : !!String(r.action || "").trim(),
};

/** Which boxes on this row are still empty, as {field: true}. */
function missingIn(row) {
  const out = {};
  Object.keys(ROW_FIELDS).forEach((f) => {
    if (!ROW_FIELDS[f](row)) out[f] = true;
  });
  return out;
}

/* ═════════════════════ Duplicate rows ═════════════════════
   The same line reaches the table twice more often than anyone admits: a note
   read by the scanner and read again, an import run a second time, a row typed
   by hand that a colleague had already typed. Nothing used to say a word about
   it, and the day was saved with that weight counted twice.

   Two rows are the SAME line only when the item, the branch and the unit all
   agree - that is the hard key. The transfer note, the expiry and the action
   are compared softly: an equal value matches, and a BLANK matches anything,
   because a blank is a box nobody filled yet, not a different value. So a
   second note from the same branch, a second batch with its own expiry, and
   the two halves of a quantity deliberately split across two actions all stay
   apart, which is the whole point - merging those would destroy the trace. */
const dupItemKey = (r) =>
  String(r?.itemCode || r?.productName || "").trim().toLowerCase().replace(/\s+/g, " ");
const dupUnitKey = (r) =>
  String((r?.qtyType === OTHER_QTY ? r?.customQtyType : r?.qtyType) || "").trim().toLowerCase();
const dupActionKey = (r) =>
  String((r?.action === "Other..." ? r?.customAction : r?.action) || "").trim().toLowerCase();
const softSame = (a, b) => !a || !b || a === b;

/** Row indexes that are the same line, as [[0,3],[5,6]]; singles are left out. */
function findDuplicateGroups(rows) {
  const byHardKey = new Map();
  rows.forEach((r, i) => {
    if (!rowHasData(r)) return;
    const item = dupItemKey(r);
    const branch = branchKeyOf(r).toLowerCase();
    // a row that does not say WHAT came back from WHERE cannot be a duplicate yet
    if (!item || !branch) return;
    const key = `${item}|${branch}|${dupUnitKey(r)}`;
    if (!byHardKey.has(key)) byHardKey.set(key, []);
    byHardKey.get(key).push(i);
  });

  const groups = [];
  byHardKey.forEach((idxs) => {
    const open = [];
    idxs.forEach((i) => {
      const r = rows[i];
      const note = String(r.transferNo || "").trim().toLowerCase();
      const exp = String(r.expiry || "").trim();
      const act = dupActionKey(r);
      const hit = open.find(
        (c) => softSame(c.note, note) && softSame(c.exp, exp) && softSame(c.act, act)
      );
      if (hit) {
        hit.idxs.push(i);
        // a blank that joined a filled line now answers for the filled value
        hit.note = hit.note || note;
        hit.exp = hit.exp || exp;
        hit.act = hit.act || act;
      } else {
        open.push({ idxs: [i], note, exp, act });
      }
    });
    open.forEach((c) => { if (c.idxs.length > 1) groups.push(c.idxs); });
  });

  return groups;
}

/* One line out of a group of duplicates: the quantities add up, every blank is
   filled from whichever copy carries the value, and the remarks and the photos
   of all the copies are kept. Nothing a person typed is thrown away, and the
   first copy keeps its place in the table. */
function mergeRowGroup(rows, idxs) {
  const [keepIdx, ...rest] = idxs;
  const merged = { ...rows[keepIdx] };

  const first = Number(merged.quantity);
  let qty = Number.isFinite(first) ? first : 0;

  const remarks = splitRemarks(merged.remarks);
  const images = safeArr(merged.images).slice();

  const COPY_FIELDS = [
    "itemCode", "productName", "origin", "butchery", "customButchery",
    "transferNo", "qtyType", "customQtyType", "expiry", "action", "customAction",
  ];

  rest.forEach((i) => {
    const r = rows[i];
    const n = Number(r.quantity);
    if (Number.isFinite(n)) qty += n;

    COPY_FIELDS.forEach((f) => {
      if (!String(merged[f] || "").trim() && String(r[f] || "").trim()) merged[f] = r[f];
    });

    splitRemarks(r.remarks).forEach((x) => {
      if (!remarks.some((y) => y.toLowerCase() === x.toLowerCase())) remarks.push(x);
    });
    safeArr(r.images).forEach((src) => { if (!images.includes(src)) images.push(src); });
  });

  // 0.1 + 0.2 must not become 0.30000000000000004 on a weight sheet
  if (qty > 0) merged.quantity = String(Number(qty.toFixed(3)));
  merged.remarks = joinRemarks(remarks);
  merged.images = images;
  return merged;
}

/* ===== Helpers: Images API ===== */
const MAX_IMAGES_PER_ROW = 8;

/* ===== Server item catalog (session-cached) =====
   fetchServerItems() is a no-store read of ~18 KB that fired on every mount,
   for a list that changes a few times a month. Hold it for the session; the
   cache lives in sessionStorage, which authFetch already wipes on logout, so
   it can never bleed into another account. */
const CATALOG_CACHE_KEY = "returns_server_items_v1";
const CATALOG_TTL_MS = 10 * 60 * 1000;

function dropCatalogCache() {
  try { sessionStorage.removeItem(CATALOG_CACHE_KEY); } catch { /* ignore */ }
}

async function fetchServerItemsCached() {
  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (raw) {
      const { at, items } = JSON.parse(raw);
      if (Array.isArray(items) && Date.now() - at < CATALOG_TTL_MS) return items;
    }
  } catch { /* unreadable cache - just refetch */ }

  const server = await fetchServerItems();
  if (Array.isArray(server)) {
    try {
      sessionStorage.setItem(
        CATALOG_CACHE_KEY,
        JSON.stringify({ at: Date.now(), items: server })
      );
    } catch { /* quota full - running without the cache is fine */ }
  }
  return server;
}

/* ===== Reports API =====
   One call does the whole save. `PUT /api/reports/returns?reportDate=…`
   updates the row for that date or inserts it if there is none, keeps the
   allocated refNo and writes the audit trail server-side.

   It replaces what used to happen here: a `?type=returns` list read to look
   up the id of an existing report — measured at 3.96 MB (331 reports, and
   growing by one a day), downloaded twice when the date was new, on EVERY
   save. It was also pointless: the save that followed it was always a POST,
   and POST always INSERTs, so a second save for the same day hit the
   (type, reportDate) unique index and came back 409 "Save failed". */
async function saveReturnsReport({ reportDate, items, checkedBy = "", verifiedBy = "" }) {
  /* ⚠️ This is the GENERIC upsert, not `PUT /api/reports/returns`.
     Both upsert on (type, reportDate) in one call and neither reads the list
     first, so the saving is the same - but the returns-only route rebuilds the
     payload from `{reportDate, items}` alone and DROPS every other key, which
     silently threw the two signatures away. The generic route stores the
     payload it is given, so whatever this sheet adds next survives too.
     ReturnView already saves through this same route. */
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "anonymous",
      type: "returns",
      payload: {
        reportDate,
        items,
        checkedBy,
        verifiedBy,
        _clientSavedAt: Date.now(),
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Server ${res.status}: ${t}`);
  }
  return res.json();
}

/* ================= Password Modal ================= */
function PasswordModal({ show, onSubmit, onClose, error }) {
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (show) setPassword("");
  }, [show]);
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44,62,80,0.24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        direction: "ltr",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2.2rem 2.5rem",
          borderRadius: 17,
          minWidth: 320,
          boxShadow: "0 4px 32px #2c3e5077",
          textAlign: "center",
          position: "relative",
          fontFamily: "Cairo,sans-serif",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 15,
            fontSize: 22,
            background: "transparent",
            border: "none",
            color: "#c0392b",
            cursor: "pointer",
          }}
        >
          ✖
        </button>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "1.18em",
            color: "#2980b9",
            marginBottom: 14,
          }}
        >
          🔒 Password required
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(password);
          }}
        >
          <input
            type="password"
            autoComplete="current-password"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            autoFocus
            placeholder="Your login password"
            style={{
              width: "90%",
              padding: "11px",
              fontSize: "1.1em",
              border: "1.8px solid #b2babb",
              borderRadius: 10,
              marginBottom: 16,
              background: "#f4f6f7",
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#884ea0",
              color: "#fff",
              border: "none",
              padding: "11px 0",
              borderRadius: 8,
              fontWeight: "bold",
              fontSize: "1.13rem",
              marginBottom: 10,
              cursor: "pointer",
              boxShadow: "0 2px 12px #d2b4de",
            }}
          >
            Sign in
          </button>
          {error && (
            <div style={{ color: "#c0392b", fontWeight: "bold", marginTop: 5 }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ===== Images Manager Modal ===== */
/* ═══════════════ The photo manager ═══════════════
   The window behind the photo button on a row. It used to be a white sheet
   with a blue "Upload images" button, a line of text and a grid of squares
   with a red ✕ that deleted without asking - and the preview opened INSIDE
   the sheet, pushing the grid down the screen.

   What it is now:
     · one drop zone that also accepts a paste (Ctrl+V) and a dragged file,
       because a photo is usually already on the clipboard from the camera roll
     · a real progress bar while the photos upload, so a slow branch line looks
       like work instead of a frozen window
     · a tile grid where the actions appear on the tile itself, and removing
       asks first - the photo is deleted from the image host, there is no undo
     · a full-screen viewer with ← → and Esc, over the window rather than in it

   `onRemoveImage(i)` and `onAddImages(urls)` are unchanged, so the row keeps
   owning its photos and this window only drives them. */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }) {
  const [viewIdx, setViewIdx] = useState(-1);      // -1 = the viewer is closed
  const [uploadMsg, setUploadMsg] = useState("");
  const [progress, setProgress] = useState(null);  // {done, total} while uploading
  const [dragOver, setDragOver] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(-1);
  const inputRef = useRef(null);

  const images = safeArr(row?.images);
  const count = images.length;
  const room = Math.max(0, MAX_IMAGES_PER_ROW - count);
  const busy = !!progress;

  /* Everything this window remembers is about ONE row, so it all resets when
     the window closes - reopening on another row must not show its state. */
  useEffect(() => {
    if (!open) {
      setViewIdx(-1);
      setUploadMsg("");
      setProgress(null);
      setDragOver(false);
      setPendingRemove(-1);
    }
  }, [open]);

  /* Esc closes the viewer first and the window second - one key, the
     innermost thing it can close. The arrows walk the photos. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (viewIdx >= 0) setViewIdx(-1);
        else if (pendingRemove >= 0) setPendingRemove(-1);
        else onClose();
        return;
      }
      if (viewIdx < 0 || count < 2) return;
      if (e.key === "ArrowRight") setViewIdx((i) => (i + 1) % count);
      if (e.key === "ArrowLeft") setViewIdx((i) => (i - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, viewIdx, count, pendingRemove]);

  /* A photo is usually already on the clipboard - from the phone, from a chat,
     from a screenshot - so pasting into this window uploads it. */
  useEffect(() => {
    if (!open) return;
    const onPaste = (e) => {
      const files = Array.from(e.clipboardData?.files || []).filter((f) =>
        String(f.type || "").startsWith("image/")
      );
      if (files.length) {
        e.preventDefault();
        uploadFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      String(f.type || "").startsWith("image/")
    );
    if (!files.length || busy) return;

    if (room <= 0) {
      setUploadMsg(`⚠️ This row already holds ${MAX_IMAGES_PER_ROW} photos — remove one first.`);
      return;
    }

    const batch = files.slice(0, room);
    const skipped = files.length - batch.length;

    const urls = [];
    let failed = 0;
    setUploadMsg("");
    for (let i = 0; i < batch.length; i++) {
      setProgress({ done: i, total: batch.length });
      try {
        urls.push(await uploadImage(batch[i], "returns_photo"));
      } catch (err) {
        failed++;
        console.error("upload failed:", err);
      }
    }
    setProgress(null);

    if (urls.length) onAddImages(urls);

    const notes = [];
    if (failed) notes.push(`${failed} failed to upload`);
    if (skipped) notes.push(`${skipped} skipped (max ${MAX_IMAGES_PER_ROW} per row)`);
    if (notes.length) setUploadMsg(`⚠️ ${notes.join(" — ")}`);
    else {
      setUploadMsg(`✅ ${urls.length} photo${urls.length === 1 ? "" : "s"} added.`);
      setTimeout(() => setUploadMsg(""), 1600);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    uploadFiles(files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer?.files);
  };

  const confirmRemove = (i) => {
    setPendingRemove(-1);
    if (viewIdx >= 0) setViewIdx(-1);
    onRemoveImage(i);
  };

  if (!open) return null;

  const subtitle = [
    row?.itemCode ? `Code ${row.itemCode}` : "",
    row?.butchery === OTHER_BRANCH ? row?.customButchery : row?.butchery,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rt-im-back" onClick={onClose}>
      <div className="rt-im-card" onClick={(e) => e.stopPropagation()}>
        {/* ── Header: which row this is, and how full it is ── */}
        <div className="rt-im-head">
          <div className="rt-im-headtxt">
            <div className="rt-im-title">
              {row?.productName || "Product photos"}
            </div>
            <div className="rt-im-sub">{subtitle || "Evidence for this returned item"}</div>
          </div>
          <div className="rt-im-headright">
            <span className={`rt-im-count${room === 0 ? " is-full" : ""}`}>
              {count} / {MAX_IMAGES_PER_ROW}
            </span>
            <button className="rt-im-x" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {/* ── Drop zone ── */}
        <div
          className={`rt-im-drop${dragOver ? " is-over" : ""}${room === 0 ? " is-full" : ""}`}
          onDragOver={(e) => { e.preventDefault(); if (room > 0 && !busy) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => { if (room > 0 && !busy) inputRef.current?.click(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && room > 0 && !busy) inputRef.current?.click();
          }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7a1 1 0 0 0 .84-.46l.92-1.42A1 1 0 0 1 9.8 3.7h4.4a1 1 0 0 1 .84.42l.92 1.42a1 1 0 0 0 .84.46h1.7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
            <circle cx="12" cy="12.4" r="3.4" />
          </svg>
          <div>
            <b>
              {room === 0
                ? `This row is full — ${MAX_IMAGES_PER_ROW} photos`
                : dragOver
                ? "Drop the photos here"
                : "Take or choose photos"}
            </b>
            <span>
              {room === 0
                ? "Remove one to make room for another."
                : `Drag them in, paste with Ctrl+V, or click to browse — ${room} left. They are shrunk on this device before they are sent.`}
            </span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />

        {/* ── What the upload is doing ── */}
        {busy && (
          <div className="rt-im-prog">
            <div className="rt-im-progtxt">
              Uploading photo {Math.min(progress.done + 1, progress.total)} of {progress.total}…
            </div>
            <div className="rt-im-track">
              <div
                className="rt-im-fill"
                style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {!busy && uploadMsg && (
          <div className={`rt-im-msg${uploadMsg.startsWith("⚠️") ? " is-warn" : ""}`}>{uploadMsg}</div>
        )}

        {/* ── The photos ── */}
        {count === 0 ? (
          <div className="rt-im-empty">No photos on this row yet.</div>
        ) : (
          <div className="rt-im-grid">
            {images.map((src, i) => (
              <figure key={`${src}_${i}`} className="rt-im-tile">
                <img
                  src={thumbUrl(src, 400)}
                  alt={`Return ${i + 1}`}
                  onClick={() => setViewIdx(i)}
                  loading="lazy"
                />
                <span className="rt-im-no">{i + 1}</span>

                {pendingRemove === i ? (
                  /* Asking before it goes: the photo is deleted from the image
                     host as well, so there is nothing to undo afterwards. */
                  <div className="rt-im-ask">
                    <b>Remove this photo?</b>
                    <div>
                      <button className="rt-im-askno" onClick={() => setPendingRemove(-1)}>Keep</button>
                      <button className="rt-im-askyes" onClick={() => confirmRemove(i)}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="rt-im-acts">
                    <button onClick={() => setViewIdx(i)} title="View full size">🔍</button>
                    <button className="is-danger" onClick={() => setPendingRemove(i)} title="Remove this photo">🗑</button>
                  </div>
                )}
              </figure>
            ))}
          </div>
        )}

        <div className="rt-im-foot">
          <span>Photos are stored on the image host, never inside the report.</span>
          <button className="rt-im-done" onClick={onClose}>Done</button>
        </div>
      </div>

      {/* ── Full-screen viewer, over the window and not inside it ── */}
      {viewIdx >= 0 && images[viewIdx] && (
        <div className="rt-im-view" onClick={(e) => { e.stopPropagation(); setViewIdx(-1); }}>
          <img src={images[viewIdx]} alt={`Return ${viewIdx + 1}`} onClick={(e) => e.stopPropagation()} />
          {count > 1 && (
            <>
              <button
                className="rt-im-nav is-prev"
                onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i - 1 + count) % count); }}
                title="Previous (←)"
              >‹</button>
              <button
                className="rt-im-nav is-next"
                onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i + 1) % count); }}
                title="Next (→)"
              >›</button>
            </>
          )}
          <div className="rt-im-viewbar" onClick={(e) => e.stopPropagation()}>
            <span>{viewIdx + 1} / {count}</span>
            <button onClick={() => { setViewIdx(-1); setPendingRemove(viewIdx); }}>🗑 Remove</button>
            <button onClick={() => setViewIdx(-1)}>✕ Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ The photo control on every row ═══════════════
   It used to be a flat blue pill reading "🖼️ Images (0)", identical on a row
   with evidence and a row without it - the only difference was a digit nobody
   reads while typing. Now the control IS the evidence: a row with no photo
   shows a dashed camera tile that asks for one, and a row that has photos
   shows the first one with the count over it. Both open the same manager. */
function PhotoButton({ images = [], onClick }) {
  const count = images.length;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rt-photo${count ? "" : " is-empty"}`}
      title={
        count
          ? `${count} photo${count === 1 ? "" : "s"} on this row — click to view, add or remove`
          : "Add a photo of this item"
      }
    >
      {count ? (
        <>
          <span className="rt-photo-thumb">
            <img src={thumbUrl(images[0], 96)} alt="" />
            {count > 1 && <i className="rt-photo-badge">{count}</i>}
          </span>
          <span className="rt-photo-txt">
            {count} photo{count === 1 ? "" : "s"}
          </span>
        </>
      ) : (
        <>
          <span className="rt-photo-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7a1 1 0 0 0 .84-.46l.92-1.42A1 1 0 0 1 9.8 3.7h4.4a1 1 0 0 1 .84.42l.92 1.42a1 1 0 0 0 .84.46h1.7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
              <circle cx="12" cy="12.4" r="3.4" />
            </svg>
          </span>
          <span className="rt-photo-txt">Add photo</span>
        </>
      )}
    </button>
  );
}

/* ===== Remarks picker (multi-select + free text) ===== */
function RemarksPicker({ value, onChange, invalid = false }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const selected = splitRemarks(value);
  const taken = selected.map((x) => x.toUpperCase());
  const available = REMARK_OPTIONS.filter((o) => !taken.includes(o));

  const add = (text) => {
    const t = String(text || "").trim();
    if (!t || taken.includes(t.toUpperCase())) return;
    onChange(joinRemarks([...selected, t]));
  };

  const removeAt = (i) => onChange(joinRemarks(selected.filter((_, x) => x !== i)));

  const commitCustom = () => {
    add(custom);
    setCustom("");
    setCustomOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          if (v === "__other__") setCustomOpen(true);
          else add(v);
        }}
        style={{
          ...inputBase,
          width: "100%",
          cursor: "pointer",
          // this cell is a picker, not an input, so it marks itself
          border: invalid ? "2px solid #ef4444" : inputBase.border,
          background: invalid ? "#fff1f2" : inputBase.background,
        }}
      >
        <option value="">+ Add remark…</option>
        {available.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="__other__">Other…</option>
      </select>

      {customOpen && (
        <input
          autoFocus
          style={{ ...inputBase, width: "100%" }}
          placeholder="Type a remark, then Enter"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustom();
            } else if (e.key === "Escape") {
              setCustom("");
              setCustomOpen(false);
            }
          }}
          onBlur={commitCustom}
        />
      )}

      {selected.length > 0 && (
        <div className="rt-note" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {selected.map((r, i) => (
            <span
              key={`${r}_${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#f4ecf7",
                color: "#512e5f",
                border: "1px solid #d7c6e0",
                borderRadius: 999,
                padding: "3px 8px",
                fontWeight: "bold",
                maxWidth: "100%",
              }}
              title={r}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 150,
                }}
              >
                {r}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                title="Remove this remark"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#c0392b",
                  cursor: "pointer",
                  fontWeight: "bold",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Confirm Delete Modal ===== */
function ConfirmDeleteModal({ show, rowNum, imageCount = 0, onConfirm, onCancel, title, message }) {
  if (!show) return null;
  return (
    <div style={{ ...galleryBack, zIndex: 3000 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "2rem 2.5rem",
          minWidth: 300,
          maxWidth: 400,
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,.2)",
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 900, fontSize: "1.1em", color: "#0f172a", marginBottom: 8 }}>
          {title || `Delete row ${rowNum}?`}
        </div>
        <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          {message || "This row contains data. Are you sure you want to delete it?"}
          {imageCount > 0 && (
            <>
              <br />
              <b style={{ color: "#b45309" }}>
                Its {imageCount} photo{imageCount === 1 ? "" : "s"} will be
                deleted from storage too.
              </b>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{ ...btnGhost, padding: "10px 24px" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 900,
              cursor: "pointer",
              padding: "10px 24px",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Post-save prompt: offer to email the report =====
   "Yes" hands off to the Returns Browser (?email=1) rather than sending from
   here — the PDF generator and email config live over there, and this way the
   user still reviews recipients before anything leaves the building. */
function SendReportPrompt({ show, reportDate, onYes, onNo }) {
  if (!show) return null;
  const dmy = /^\d{4}-\d{2}-\d{2}$/.test(String(reportDate || ""))
    ? String(reportDate).split("-").reverse().join("/")
    : reportDate;
  return (
    <div style={{ ...galleryBack, zIndex: 3000 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "2rem 2.5rem",
          minWidth: 320,
          maxWidth: 440,
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,.2)",
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📨</div>
        <div style={{ fontWeight: 900, fontSize: "1.1em", color: "#0f172a", marginBottom: 8 }}>
          Send this report by e-mail?
        </div>
        <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
          The returns report for <b>{dmy}</b> has been saved.
          <br />
          "Yes" opens the send window so you can choose the recipients.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onNo} style={{ ...btnGhost, padding: "10px 24px" }}>
            No
          </button>
          <button
            onClick={onYes}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 900,
              cursor: "pointer",
              padding: "10px 24px",
            }}
          >
            Yes, send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== The chosen day is already on file =====
   The only screen between a mistyped date and an overwritten day, so it says
   plainly what will happen and offers to open the day first. Viewing opens in
   a second tab: this table full of typing must survive the detour. */
function ReplaceDayModal({ show, reportDate, rowCount, onConfirm, onCancel }) {
  if (!show) return null;
  const dmy = /^\d{4}-\d{2}-\d{2}$/.test(String(reportDate || ""))
    ? String(reportDate).split("-").reverse().join("/")
    : reportDate;
  return (
    <div style={{ ...galleryBack, zIndex: 3000 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "2rem 2.5rem",
          minWidth: 340,
          maxWidth: 470,
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,.2)",
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛑</div>
        <div style={{ fontWeight: 900, fontSize: "1.1em", color: "#0f172a", marginBottom: 8 }}>
          {dmy} already has a returns report
        </div>
        <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
          Saving does not add to that report — it <b>replaces</b> it with the
          {" "}{rowCount} row{rowCount === 1 ? "" : "s"} on this screen, and whatever
          it holds now is gone.
          <br />
          If the date is wrong, cancel and correct it.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onCancel} style={{ ...btnGhost, padding: "10px 22px" }}>
            Cancel
          </button>
          <button
            onClick={() => window.open("/returns/view", "_blank", "noopener")}
            style={{ ...btnGhost, padding: "10px 22px" }}
            title="Opens in a new tab so nothing typed here is lost"
          >
            👁️ View that day first
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 900,
              cursor: "pointer",
              padding: "10px 22px",
            }}
          >
            Replace it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Items Catalog Modal (Add new item code) ===== */
function AddItemModal({ open, onClose, onAdd, error }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
    }
  }, [open]);
  if (!open) return null;

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={{ ...galleryCard, width: "min(720px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>➕ Add New Item</div>
          <button onClick={onClose} style={galleryClose}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginBottom: 6 }}>ITEM CODE</div>
            <input
              style={{ ...inputBase, width: "100%" }}
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="e.g. 20060"
              inputMode="numeric"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginBottom: 6 }}>PRODUCT NAME</div>
            <input
              style={{ ...inputBase, width: "100%" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BRAZILIAN BEEF TOPSIDE - KG"
            />
          </div>

          {error && <div style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={onClose} style={{ ...btnGhost }}>
              Cancel
            </button>
            <button
              onClick={() => onAdd(code, name)}
              style={{ ...btnPrimary, background: "#2563eb", boxShadow: "0 1px 6px #bfdbfe" }}
            >
              Save item
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#64748b" }}>
            * Duplicates are blocked automatically. The item is stored locally and pushed to the server when the endpoint is available.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== Main page ====================== */
/* ═══════════ Document-control header (the form's identity) ═══════════
   The block every controlled QA form opens with: who issues it, under which
   number, at which revision. It is fixed text - nobody types into it - and it
   is deliberately the same text the Excel backup prints, so a sheet read on
   the screen and the same sheet read out of the file are one document.

   The report date is shown here as well, because on a printed page the date
   belongs inside the document block and not only in the editing bar above it. */
function DocumentControl({ reportDate }) {
  const dmy = /^\d{4}-\d{2}-\d{2}$/.test(String(reportDate || ""))
    ? String(reportDate).split("-").reverse().join("/")
    : reportDate || "—";

  const cells = [
    ["Document Title", DOC.title],
    ["Document No", DOC.no],
    ["Issue Date", DOC.issueDate],
    ["Revision No", DOC.revisionNo],
    ["Area", DOC.area],
    ["Issued By", DOC.issuedBy],
    ["Controlling Officer", DOC.controllingOfficer],
    ["Approved By", DOC.approvedBy],
    ["Report Date", dmy],
    ["Company", DOC.company],
  ];
  const pairs = [];
  for (let i = 0; i < cells.length; i += 2) pairs.push([cells[i], cells[i + 1] || null]);

  const cell = {
    border: "1px solid #c7b8d4",
    padding: "6px 10px",
    verticalAlign: "middle",
    color: "#3b2149",
    fontSize: 12.5,
  };

  return (
    <div style={{ marginBottom: 14, overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fdfbff",
          border: "1px solid #c7b8d4",
          minWidth: 640,
        }}
      >
        <tbody>
          {pairs.map((pair, ri) => (
            <tr key={ri}>
              {ri === 0 && (
                <td
                  rowSpan={pairs.length}
                  style={{ ...cell, width: 130, textAlign: "center", background: "#f5eeff" }}
                >
                  <div style={{ fontWeight: 900, color: "#b91c1c", lineHeight: 1.15, fontSize: 15 }}>
                    AL<br />MAWASHI
                  </div>
                </td>
              )}
              {pair.map((c, ci) =>
                c ? (
                  <td key={ci} style={cell}>
                    <b style={{ fontWeight: 800 }}>{c[0]}:</b> <span>{c[1] || "—"}</span>
                  </td>
                ) : (
                  <td key={ci} style={cell} />
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          textAlign: "center",
          background: "#ede3f7",
          border: "1px solid #c7b8d4",
          borderTop: "none",
          color: "#3b2149",
          fontWeight: 800,
          letterSpacing: ".4px",
          padding: "6px 4px",
          fontSize: 13,
        }}
      >
        BRANCH RETURNS REPORT
      </div>
    </div>
  );
}

/* ═══════════════ Bulk-edit toolbar ═══════════════
   Appears the moment a row is ticked. One value, one Apply button per field,
   so a whole transfer note's worth of rows takes their date / action / remark /
   branch / transfer number in a single click each instead of row by row. It
   owns only its own draft inputs; the actual change is done by the callbacks,
   which mutate the report and clear the matching save marks. */
function BulkEditBar({
  count,
  onDate,
  onAction,
  onRemarks,
  onBranch,
  onTransferNo,
  onClear,
  onDelete,
}) {
  const [date, setDate] = useState("");
  const [action, setAction] = useState("");
  const [customAction, setCustomAction] = useState("");
  const [remark, setRemark] = useState("");
  const [customRemark, setCustomRemark] = useState("");
  const [branch, setBranch] = useState("");
  const [customBranch, setCustomBranch] = useState("");
  const [trn, setTrn] = useState("");

  const fieldWrap = { display: "flex", flexDirection: "column", gap: 5, minWidth: 172 };
  const label = {
    fontSize: 11,
    fontWeight: 900,
    color: "#6b21a8",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  };
  const ctl = {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    fontSize: "0.92em",
  };
  const applyBtn = (on) => ({
    background: on ? "#7c3aed" : "#e9d5ff",
    color: on ? "#fff" : "#a78bca",
    border: "none",
    borderRadius: 9,
    fontWeight: 800,
    cursor: on ? "pointer" : "not-allowed",
    padding: "8px 12px",
    whiteSpace: "nowrap",
  });
  const miniBtn = (on) => ({ ...applyBtn(on), padding: "8px 10px", fontSize: "0.85em" });

  const remarkValue = remark === "__other__" ? customRemark.trim() : remark;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #faf5ff, #f3e8ff)",
        border: "1.5px solid #c4b5fd",
        borderRadius: 14,
        padding: "12px 16px",
        marginBottom: 12,
        boxShadow: "0 6px 18px rgba(124,58,237,.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 900, color: "#5b21b6", fontSize: "1.02em" }}>
          ✓ {count} row{count === 1 ? "" : "s"} selected — apply to all of them
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={onClear} style={{ ...btnGhost, padding: "7px 14px" }}>
          Clear selection
        </button>
        <button
          onClick={onDelete}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 900,
            cursor: "pointer",
            padding: "7px 14px",
          }}
          title="Delete every selected row"
        >
          🗑 Delete selected
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* EXPIRY DATE */}
        <div style={fieldWrap}>
          <span style={label}>Expiry date</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="date"
              style={ctl}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              style={applyBtn(!!date)}
              disabled={!date}
              onClick={() => onDate(date)}
            >
              Apply
            </button>
          </div>
        </div>

        {/* ACTION */}
        <div style={fieldWrap}>
          <span style={label}>Action</span>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              style={{ ...ctl, appearance: "auto" }}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">Select action</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{`${ACTION_STYLE[a].mark} ${a}`}</option>
              ))}
            </select>
            <button
              style={applyBtn(!!action && (action !== "Other..." || !!customAction.trim()))}
              disabled={!action || (action === "Other..." && !customAction.trim())}
              onClick={() => onAction(action, customAction.trim())}
            >
              Apply
            </button>
          </div>
          {action === "Other..." && (
            <input
              style={ctl}
              placeholder="Custom action"
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
            />
          )}
        </div>

        {/* REMARKS */}
        <div style={{ ...fieldWrap, minWidth: 210 }}>
          <span style={label}>Remark</span>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              style={{ ...ctl, appearance: "auto" }}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            >
              <option value="">Select remark</option>
              {REMARK_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="__other__">Other…</option>
            </select>
            <button
              style={miniBtn(!!remarkValue)}
              disabled={!remarkValue}
              onClick={() => onRemarks(remarkValue, "set")}
              title="Replace the remark on every selected row"
            >
              Set
            </button>
            <button
              style={miniBtn(!!remarkValue)}
              disabled={!remarkValue}
              onClick={() => onRemarks(remarkValue, "add")}
              title="Add this remark, keeping any the rows already have"
            >
              + Add
            </button>
          </div>
          {remark === "__other__" && (
            <input
              style={ctl}
              placeholder="Type a remark"
              value={customRemark}
              onChange={(e) => setCustomRemark(e.target.value)}
            />
          )}
        </div>

        {/* BRANCH */}
        <div style={fieldWrap}>
          <span style={label}>Branch</span>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              style={{ ...ctl, appearance: "auto" }}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{enLabel(b)}</option>
              ))}
            </select>
            <button
              style={applyBtn(!!branch && (branch !== OTHER_BRANCH || !!customBranch.trim()))}
              disabled={!branch || (branch === OTHER_BRANCH && !customBranch.trim())}
              onClick={() => onBranch(branch, customBranch.trim())}
            >
              Apply
            </button>
          </div>
          {branch === OTHER_BRANCH && (
            <input
              style={ctl}
              placeholder="Branch name"
              value={customBranch}
              onChange={(e) => setCustomBranch(e.target.value)}
            />
          )}
        </div>

        {/* TRANSFER NO */}
        <div style={fieldWrap}>
          <span style={label}>Transfer no</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={ctl}
              inputMode="numeric"
              placeholder="e.g. 02323"
              value={trn}
              onChange={(e) => setTrn(e.target.value)}
            />
            <button
              style={applyBtn(!!trn.trim())}
              disabled={!trn.trim()}
              onClick={() => onTransferNo(trn.trim())}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Returns() {
  const navigate = useNavigate();

  /* ===== Password ===== */
  const [modalOpen, setModalOpen] = useState(false); // password gate removed
  const [modalError, setModalError] = useState("");
  const handleSubmitPassword = async (val) => {
    if (!val) return;
    try {
      const cu = (() => { try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; } })();
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cu.username || "", password: val }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        setModalOpen(false);
        setModalError("");
      } else {
        setModalError("❌ Wrong password!");
      }
    } catch {
      setModalError("❌ Verification failed — check your connection.");
    }
  };
  const handleCloseModal = () => navigate("/returns/menu", { replace: true });

  /* ===== UI ===== */
  const [compact, setCompact] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  /* The second way in: a note that was read somewhere else and arrives as a
     file of plain values. Same landing path as the scanner (`applyScan`), so
     rows behave identically however they were read. */
  const [importOpen, setImportOpen] = useState(false);

  /* ===== Data ===== */
  const makeEmptyRow = () => ({
    itemCode: "",
    productName: "",
    origin: "",
    butchery: "",
    transferNo: "",
    customButchery: "",
    quantity: "",
    qtyType: "KG",
    customQtyType: "",
    expiry: "",
    remarks: "",
    action: "",
    customAction: "",
    images: [],
  });

  // ✅ Restore draft date from localStorage (fallback to today)
  const [reportDate, setReportDate] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_DATE_KEY) || getToday();
    } catch {
      return getToday();
    }
  });

  // ✅ Restore draft rows from localStorage
  const [rows, setRows] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // ignore
    }
    return [makeEmptyRow()];
  });

  /* Who filled the sheet in and who checked it afterwards. Every other
     controlled report on the system carries these two names, and an audit
     reads them before it reads the rows. They travel inside the payload, so
     the view, the e-mail and the Excel backup all show the same two people.
     "Checked by" opens on whoever is signed in - it is nearly always them -
     and stays editable, because a supervisor may sign for a sheet a clerk
     typed. "Verified by" is never guessed: it is a second person's signature
     and proposing a name there would be putting words in their mouth. */
  const [checkedBy, setCheckedBy] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_SIGN_KEY) || "{}");
      if (typeof d.checkedBy === "string") return d.checkedBy;
    } catch { /* ignore */ }
    return signedInName();
  });
  const [verifiedBy, setVerifiedBy] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_SIGN_KEY) || "{}");
      if (typeof d.verifiedBy === "string") return d.verifiedBy;
    } catch { /* ignore */ }
    return "";
  });

  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  /* Holds the just-saved report date while the "send it now?" prompt is up. */
  const [sendPromptDate, setSendPromptDate] = useState("");

  /* Which dates already carry a saved returns report.
       Set   - the index loaded, every date is answered from it
       false - the index could not be read; the save is NOT blocked for it
       null  - still loading
     `savedHere` is the dates saved by this session: the user wrote them a
     moment ago, so a correction save must not stop to ask about them. */
  const [filedDates, setFiledDates] = useState(null);
  const [savedHere, setSavedHere] = useState(() => new Set());
  const [replacePrompt, setReplacePrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchFiledDates("returns")
        .then((dates) => { if (!cancelled) setFiledDates(new Set(dates)); })
        .catch(() => { if (!cancelled) setFiledDates(false); });
    };
    load();
    /* The view screen - normally a second tab - can delete a day or move it to
       another date. It keeps the shared index straight, so re-reading that
       index when this tab is looked at again is what keeps the warning honest
       instead of pointing at a day that no longer exists. */
    const stopWatching = subscribeFiledDates("returns", load);
    const recheck = () => { if (!document.hidden) load(); };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      cancelled = true;
      stopWatching();
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, []);

  const dateAlreadyFiled =
    !!(filedDates && filedDates.has(reportDate)) && !savedHere.has(reportDate);

  // ✅ Track whether there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const savedRowsRef = useRef(null); // JSON of the last-saved rows + signatures

  /* Draft auto-save, debounced.
     This used to run on every keystroke and serialise the whole table TWICE
     (once for the draft, once to compare against the saved snapshot), which
     is what made typing stutter on a report with many rows. Now it waits
     400 ms after the last edit and serialises once. */
  useEffect(() => {
    const t = setTimeout(() => {
      const json = JSON.stringify(rows);
      try {
        localStorage.setItem(DRAFT_KEY, json);
        localStorage.setItem(DRAFT_DATE_KEY, reportDate);
        localStorage.setItem(DRAFT_SIGN_KEY, JSON.stringify({ checkedBy, verifiedBy }));
      } catch {
        // ignore
      }
      /* The two signatures are part of the report, so typing one is an unsaved
         change like any other - the snapshot below carries them with the rows. */
      const snap = JSON.stringify({ rows, checkedBy, verifiedBy });
      if (savedRowsRef.current !== null) {
        setIsDirty(snap !== savedRowsRef.current);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [rows, reportDate, checkedBy, verifiedBy]);

  // ✅ Warn before leaving page if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  /* ===== Load the item catalog from /public/data/items.json ===== */
  const [itemsAll, setItemsAll] = useState([]);
  const [itemsLoadError, setItemsLoadError] = useState("");

  useEffect(() => {
    const tryLoad = async () => {
      setItemsLoadError("");
      try {
        const r1 = await fetch("/data/items.json", { cache: "no-cache" });
        if (r1.ok) {
          const j = await r1.json();
          if (Array.isArray(j)) {
            setItemsAll(j);
            return;
          }
        }
      } catch {
        // continue
      }

      try {
        const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
        const r2 = await fetch(`${base}/data/items.json`, { cache: "no-cache" });
        if (r2.ok) {
          const j = await r2.json();
          if (Array.isArray(j)) {
            setItemsAll(j);
            return;
          }
        }
        setItemsLoadError("⚠️ Could not read /data/items.json. Make sure the file exists in public/data.");
      } catch (err) {
        console.error("items load failed:", err);
        setItemsLoadError("⚠️ Failed to load the items file.");
      }
    };
    tryLoad();
  }, []);

  /* ===== Custom Items ===== */
  const [customItems, setCustomItems] = useState(() => loadCustomItems());
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemError, setAddItemError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const server = await fetchServerItemsCached();
      if (!cancelled && Array.isArray(server) && server.length > 0) {
        setCustomItems((prev) => {
          const mergedByCode = new Map();
          safeArr(prev).forEach((it) => {
            const key = normalize(it?.item_code ?? it?.itemCode);
            if (key) mergedByCode.set(key, it);
          });
          server.forEach((it) => {
            const key = normalize(it?.item_code ?? it?.itemCode);
            if (key) mergedByCode.set(key, it);
          });
          return Array.from(mergedByCode.values());
        });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    saveCustomItems(customItems);
  }, [customItems]);

  const normalize = (v) =>
    String(v ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[-_()\/\\]/g, "");

  const allItems = useMemo(() => {
    const map = new Map();
    const push = (it) => {
      const code = String(it?.item_code ?? it?.itemCode ?? "").trim();
      const name = String(it?.description ?? it?.productName ?? it?.name ?? "").trim();
      if (!code || !name) return;
      const key = normalize(code);
      if (!key) return;
      if (!map.has(key))
        map.set(key, {
          item_code: code,
          description: name,
          origin: String(it?.origin ?? "").trim(),
          category: String(it?.category ?? "").trim(),
          uom: String(it?.uom ?? "").trim(),
          __custom: !!it.__custom,
        });
    };
    safeArr(itemsAll).forEach(push);
    safeArr(customItems).forEach((x) => push({ ...x, __custom: true }));
    return Array.from(map.values());
  }, [itemsAll, customItems]);

  /* digits-only item code -> catalog item, used by the return-note scanner */
  const catalogByDigits = useMemo(() => {
    const m = new Map();
    allItems.forEach((it) => {
      const d = String(it.item_code || "").replace(/\D/g, "");
      if (d && !m.has(d)) m.set(d, it);
    });
    return m;
  }, [allItems]);

  /* Turn the codes read from the scanned notes into report rows.
     `entries` is [{ code, branch }] in the page order shown in the scanner,
     so several papers - from different branches - land in one pass and keep
     their order. The scanner sends codes only: the product name comes from
     our catalog, exactly as it would if the code had been typed by hand.

     The IMPORT dialog sends the same payload with more of the line filled in
     (weight, expiry, remarks, action), because a note read away from the app
     arrives as text and has nothing left to guess at. Every one of those
     fields is OPTIONAL and every one is checked against the same lists the
     dropdowns offer - an action we do not have becomes "Other...", an origin
     we do not have is ignored rather than written into a select that cannot
     show it - so a file cannot put a value in a row that a person could not
     have typed there. */
  const applyScan = ({ entries }) => {
    if (!Array.isArray(entries) || !entries.length) return;

    setRows((prev) => {
      const next = prev.slice();

      /* A scan is one or more papers read top to bottom, so its rows have to
         land as a CONTIGUOUS BLOCK in that order.

         Reusing the first blank row found anywhere - which is what this did -
         broke that whenever the table had a gap in the middle: the first
         scanned item dropped into that gap, above rows already entered, and
         everything after it appended at the bottom. The draft then no longer
         matched the paper it was read from, which is the one thing a scanned
         draft has to do.

         Only the blank rows at the END are reused, so the usual trailing empty
         row is still consumed rather than left stranded. A gap in the middle is
         left exactly where it is. */
      let at = next.length;
      while (at > 0 && !rowHasData(next[at - 1])) at--;

      entries.forEach((entry) => {
        const { code, branch, transferNo, ordered } = entry;
        const hit = allItems.find(
          (it) => normalize(it.item_code) === normalize(code)
        );
        const known = !!branch && BRANCHES.includes(branch);
        next[at] = {
          ...makeEmptyRow(),
          itemCode: String(code || ""),
          ...catalogPatch(hit),
          butchery: branch ? (known ? branch : OTHER_BRANCH) : "",
          customButchery: branch && !known ? branch : "",
          transferNo: String(transferNo || ""),
          /* the paper still names its column ORDERED - it holds the quantity */
          quantity: String(entry.quantity ?? ordered ?? ""),
          ...extraFromEntry(entry, hit),
        };
        at++;
      });

      // always leave one empty row to type into
      if (next.length && rowHasData(next[next.length - 1])) next.push(makeEmptyRow());
      return next;
    });

    const pages = new Set(entries.map((e) => e.branch || "?")).size;
    setSaveMsg(
      // reads the same whether the notes were photographed or imported
      `✅ ${entries.length} row(s) added from ${pages} branch${pages === 1 ? "" : "es"}.`
    );
    setTimeout(() => setSaveMsg(""), 2600);
  };

  async function trySaveCustomItemToServer(item) {
    const endpoints = [`${API_BASE}/api/items`, `${API_BASE}/api/catalog/items`];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "returns_items", item }),
        });
        if (res.ok) return true;
      } catch {
        // try next
      }
    }
    return false;
  }

  const handleAddNewItem = async (code, name) => {
    setAddItemError("");

    const c = String(code || "").trim();
    const n = String(name || "").trim();
    if (!c) return setAddItemError("❌ ITEM CODE is required.");
    if (!n) return setAddItemError("❌ PRODUCT NAME is required.");

    const key = normalize(c);
    const exists = allItems.some((it) => normalize(it.item_code) === key);
    if (exists) return setAddItemError("❌ This code already exists (duplicate).");

    const newItem = { item_code: c, description: n };
    setCustomItems((prev) => [newItem, ...prev]);
    setAddItemOpen(false);
    setSaveMsg("✅ Item added to catalog.");
    setTimeout(() => setSaveMsg(""), 1800);

    try {
      await trySaveCustomItemToServer(newItem);
      dropCatalogCache();
    } catch {
      // ignore
    }

    setRows((prev) =>
      prev.map((r) => {
        if (normalize(r.itemCode) === key && !String(r.productName || "").trim()) {
          return { ...r, productName: n };
        }
        return r;
      })
    );
  };

  /* ===== Local search + normalization ===== */

  const localSearch = (q) => {
    const s = normalize(q);
    if (!s) return allItems.slice(0, 20);
    return allItems
      .filter((it) => {
        const code = normalize(it.item_code);
        const name = normalize(it.description);
        return code.startsWith(s) || code.includes(s) || name.includes(s);
      })
      .slice(0, 20);
  };

  /* The product name is owned by the item code: one lookup, one source. */
  const lookupByCode = useCallback(
    (code) => {
      const s = normalize(code);
      if (!s) return null;
      return allItems.find((it) => normalize(it.item_code) === s) || null;
    },
    [allItems] // eslint-disable-line
  );

  /* Everything the item code owns, in one place.
     productName and origin mirror the code strictly: an item with no origin in
     the catalog really is "origin unknown", so a stale value must not survive a
     code change. The unit of measure is different — a blank one only means the
     item predates the ERP export, so the row keeps whatever it already had. */
  const catalogPatch = (hit) => {
    const patch = {
      productName: hit ? hit.description : "",
      origin: hit?.origin || "",
    };
    const q = hit ? qtyTypeFromUom(hit.uom) : null;
    if (q) {
      patch.qtyType = q.qtyType;
      patch.customQtyType = q.customQtyType;
    }
    return patch;
  };

  const pickItem = (idx, item) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? { ...r, itemCode: item.item_code, ...catalogPatch(item) }
          : r
      )
    );
  };

  /* One paper covers one branch, so the transfer number typed on any row
     belongs to every row of that branch in this report. Runs when the field
     is left (not on each keystroke - otherwise "0", "02", "023"… would each
     be spread in turn).

     Rows that already carry a DIFFERENT number are left alone: a branch can
     send two transfers in the same day, and silently overwriting the second
     one would be data loss. Those are reported instead. */
  const propagateTransferNo = (idx) => {
    const src = rows[idx];
    const trn = String(src?.transferNo || "").trim();
    const key = branchKeyOf(src);
    if (!trn || !key) return;

    const targets = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => i !== idx && branchKeyOf(r) === key);

    const blanks = targets.filter(({ r }) => !String(r.transferNo || "").trim());
    const different = targets.filter(({ r }) => {
      const v = String(r.transferNo || "").trim();
      return v && v !== trn;
    });

    if (blanks.length) {
      const fill = new Set(blanks.map(({ i }) => i));
      setRows((prev) =>
        prev.map((r, i) => (fill.has(i) ? { ...r, transferNo: trn } : r))
      );
    }

    if (blanks.length || different.length) {
      const branchName =
        src.butchery === OTHER_BRANCH ? src.customButchery || "this branch" : src.butchery;
      const parts = [];
      if (blanks.length) {
        parts.push(`✅ Transfer ${trn} applied to ${blanks.length} more ${branchName} row(s).`);
      }
      if (different.length) {
        parts.push(`${different.length} row(s) kept their own number.`);
      }
      setSaveMsg(parts.join(" "));
      setTimeout(() => setSaveMsg(""), 3200);
    }
  };

  const addRow = () => setRows((prev) => [...prev, makeEmptyRow()]);

  /* ===== Table keyboard + clipboard =====
     Both hang off the table wrapper rather than every cell: one handler, and
     the cells stay plain inputs. */

  const tableRef = useRef(null);

  /** The row/column the caret is in, read off the DOM markers. */
  const focusedCell = () => {
    const el = document.activeElement;
    if (!el || !tableRef.current?.contains(el)) return null;
    const col = el.getAttribute?.("data-col") || "";
    const tr = el.closest?.("tr[data-row]");
    const row = tr ? Number(tr.getAttribute("data-row")) : -1;
    return row >= 0 ? { row, col } : null;
  };

  /** Put the caret in the same column of another row, if that cell exists. */
  const focusCell = (row, col) => {
    const host = tableRef.current;
    if (!host) return false;
    const sel = col ? `tr[data-row="${row}"] [data-col="${col}"]` : `tr[data-row="${row}"] [data-col]`;
    const el = host.querySelector(sel);
    if (!el) return false;
    el.focus();
    if (el.select) { try { el.select(); } catch { /* selects are not selectable */ } }
    return true;
  };

  /* Enter walks down the column, Ctrl/Cmd+D fills the row from the one above.
     Both are what a keyboard-only operator expects from a grid, and both are
     what this form was missing. */
  const handleTableKeyDown = (e) => {
    // the item-code suggestion list gets first refusal on Enter and the arrows
    if (e.defaultPrevented) return;

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const at = focusedCell();
      if (!at) return;
      e.preventDefault();
      // no row below: grow the table first, but never after an empty row -
      // Enter at the bottom of a finished table should not breed blank rows
      if (!focusCell(at.row + 1, at.col)) {
        if (!rowHasData(rows[at.row])) return;
        setRows((prev) => [...prev, makeEmptyRow()]);
        setTimeout(() => focusCell(at.row + 1, at.col), 0);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
      const at = focusedCell();
      if (!at) return;
      // claimed before the checks below, so a no-op never opens the browser's
      // own Ctrl+D (add bookmark) behind the table
      e.preventDefault();
      const src = at.row >= 1 ? rows[at.row - 1] : null;
      if (!src || !rowHasData(src)) return;

      setRows((prev) => {
        const next = prev.slice();
        // images belong to the row that was photographed, never to a copy
        next[at.row] = { ...src, images: [] };
        // a duplicate of the last row needs a fresh empty row under it
        if (at.row === prev.length - 1) next.push(makeEmptyRow());
        return next;
      });
      setSaveMsg(`✅ Row ${at.row + 1} filled from row ${at.row}.`);
      setTimeout(() => setSaveMsg(""), 1800);
    }
  };

  /* Paste a block copied out of Excel: column 1 is the item code, column 2 the
     quantity if it is there. A single cell with no tab and no newline is left
     to the browser - that is an ordinary paste into one field. */
  const handleTablePaste = (e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (!text || !/[\t\n\r]/.test(text.trim())) return;

    const table = parseClipboardTable(text);
    if (!table.length) return;

    const at = focusedCell();
    const start = at ? at.row : 0;
    e.preventDefault();

    /* Resolved BEFORE the state update, for two reasons: React runs an updater
       twice in development, which would double any counting done inside it, and
       the message below has to read those counts synchronously. Dropping the
       code-less lines here also keeps the write positions contiguous, so no row
       index is skipped. */
    const entries = [];
    table.forEach((cells) => {
      const code = String(cells[0] || "").trim();
      if (!code) return;
      entries.push({
        code,
        hit: lookupByCode(code),
        qty: cells.length > 1 ? numberFromCell(cells[1]) : "",
      });
    });
    if (!entries.length) return;

    const matched = entries.filter((x) => x.hit).length;
    const unknown = entries.length - matched;

    setRows((prev) => {
      const next = prev.slice();
      entries.forEach(({ code, hit, qty }, i) => {
        const idx = start + i;
        const base = next[idx] || makeEmptyRow();
        const patched = { ...base, itemCode: code, ...catalogPatch(hit) };
        if (qty !== "") patched.quantity = qty;
        next[idx] = patched;
      });
      // always leave one empty row to type into
      if (next.length && rowHasData(next[next.length - 1])) next.push(makeEmptyRow());
      return next;
    });

    const notes = [`${entries.length} row(s) pasted`];
    if (matched) notes.push(`${matched} matched the catalog`);
    if (unknown) notes.push(`${unknown} unknown code(s)`);
    setSaveMsg(`${unknown ? "⚠️" : "✅"} ${notes.join(" — ")}.`);
    setTimeout(() => setSaveMsg(""), 4000);
  };


  /* ===== ✅ Confirm Delete Modal ===== */
  const [confirmDelete, setConfirmDelete] = useState({ show: false, idx: -1 });

  const requestRemoveRow = (index) => {
    const row = rows[index];
    if (rowHasData(row)) {
      // Show confirm modal
      setConfirmDelete({ show: true, idx: index });
    } else {
      // Empty row — delete immediately
      setSelected(new Set());
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const confirmRemoveRow = () => {
    const { idx } = confirmDelete;
    setConfirmDelete({ show: false, idx: -1 });
    setSelected(new Set());
    const orphans = safeArr(rows?.[idx]?.images);
    setRows((prev) => prev.filter((_, i) => i !== idx));
    // fire-and-forget: the row is gone from the report either way
    orphans.forEach((url) => {
      deleteImage(url).catch(() => {});
    });
  };

  const cancelRemoveRow = () => setConfirmDelete({ show: false, idx: -1 });

  /* ===== Validation ===== */
  const [rowErrors, setRowErrors] = useState({});

  /* ═════════════════════ Bulk edit ═════════════════════
     Tick several rows, change their date / action / remark / branch / transfer
     number in ONE move. A whole transfer note is usually the same branch, the
     same expiry and the same action, so editing each row on its own is exactly
     the tedium this removes. Selection is by row index: it is transient (a
     select → apply → done gesture) and every structural change - a delete, a
     merge - clears it so an index can never point at the wrong row. */
  const [selected, setSelected] = useState(() => new Set());

  const validateBeforeSave = (preparedRows) => {
    const errors = {};
    const used = preparedRows.map((r, idx) => ({ r, idx })).filter(({ r }) => rowHasData(r));

    used.forEach(({ r, idx }) => {
      const e = {};
      const hasKey = !!(r.itemCode || r.productName);
      if (!hasKey) e.itemCode = true;
      if (!String(r.butchery || "").trim()) e.butchery = true;
      if (!(Number.isFinite(Number(r.quantity)) && Number(r.quantity) > 0)) e.quantity = true;
      if (!String(r.action || "").trim()) e.action = true;
      if (isCondemnation(r.action) && !String(r.remarks || "").trim()) e.remarks = true;
      if (Object.keys(e).length) errors[idx] = e;
    });

    return errors;
  };

  const handleChange = (idx, field, value) => {
    setRowErrors((prev) => {
      if (!prev[idx]) return prev;
      const next = { ...prev };
      next[idx] = { ...next[idx] };
      delete next[idx][field];
      if (!Object.keys(next[idx]).length) delete next[idx];
      return next;
    });

    setRows((prev) => {
      const updated = [...prev];
      const current = { ...updated[idx] };

      if (field === "itemCode") {
        const code = String(value ?? "");
        const hit = lookupByCode(code);
        current.itemCode = code;
        // PRODUCT NAME / ORIGIN / QTY TYPE all come from the code
        Object.assign(current, catalogPatch(hit));
        updated[idx] = current;

        // ✅ Auto-add row when editing the last row
        if (idx === updated.length - 1 && String(value ?? "").trim()) {
          return [...updated, makeEmptyRow()];
        }
        return updated;
      }

      current[field] = value;

      if (field === "butchery" && value !== OTHER_BRANCH) current.customButchery = "";

      /* Just picked a branch on an empty-numbered row: take the transfer
         number the rest of that branch already uses today. */
      if (field === "butchery" && !String(current.transferNo || "").trim()) {
        const key = branchKeyOf(current);
        const donor = key
          ? updated.find((r, i) => i !== idx && branchKeyOf(r) === key && String(r.transferNo || "").trim())
          : null;
        if (donor) current.transferNo = String(donor.transferNo).trim();
      }
      if (field === "action" && value !== "Other...") current.customAction = "";
      if (field === "qtyType" && value !== OTHER_QTY) current.customQtyType = "";

      updated[idx] = current;

      // ✅ Auto-add row when editing a non-code field in the last row
      if (idx === updated.length - 1 && rowHasData(current)) {
        return [...updated, makeEmptyRow()];
      }

      return updated;
    });

  };

  /* Which rows can be ticked: only the ones that carry data. The trailing
     empty line is the box you type into, not a row you act on. */
  const dataRowIdx = useMemo(
    () => rows.map((r, i) => (rowHasData(r) ? i : -1)).filter((i) => i >= 0),
    [rows]
  );
  const allSelected = dataRowIdx.length > 0 && dataRowIdx.every((i) => selected.has(i));
  const selectedCount = useMemo(
    () => [...selected].filter((i) => i < rows.length && rowHasData(rows[i])).length,
    [selected, rows]
  );

  const toggleSelectRow = (idx) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(dataRowIdx));

  const clearSelection = () => setSelected(new Set());

  /* Smart select: type row numbers / ranges ("10-20, 25") and tick exactly
     those, ignoring any that fall on the empty trailing line. Add mode ORs the
     typed rows onto whatever is already ticked. */
  const [rangeText, setRangeText] = useState("");
  const selectByRange = (add = false) => {
    const parsed = parseRowRanges(rangeText, rows.length);
    const wanted = [...parsed].filter((i) => rowHasData(rows[i]));
    if (!wanted.length) {
      setSaveMsg(`⚠️ No filled rows matched "${rangeText.trim()}".`);
      setTimeout(() => setSaveMsg(""), 2600);
      return;
    }
    setSelected((prev) => {
      const next = add ? new Set(prev) : new Set();
      wanted.forEach((i) => next.add(i));
      return next;
    });
    setSaveMsg(`✅ ${add ? "Added" : "Selected"} ${wanted.length} row(s).`);
    setTimeout(() => setSaveMsg(""), 2600);
  };

  /* Smart select by what is missing: the same checks Save runs, so ticking
     "incomplete" rows and bulk-filling them clears exactly the red marks
     Save would raise. */
  const INCOMPLETE_KINDS = [
    { key: "any", label: "Any missing field" },
    { key: "itemCode", label: "No item code / product" },
    { key: "butchery", label: "No branch" },
    { key: "quantity", label: "No quantity" },
    { key: "action", label: "No action" },
    { key: "remarks", label: "Condemnation without remark" },
  ];
  const incompleteByKind = useMemo(() => {
    const errs = validateBeforeSave(rows);
    const out = Object.fromEntries(INCOMPLETE_KINDS.map((k) => [k.key, []]));
    Object.entries(errs).forEach(([idx, e]) => {
      const i = Number(idx);
      out.any.push(i);
      Object.keys(e).forEach((field) => out[field] && out[field].push(i));
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  const selectIncomplete = (kind, add = false) => {
    const wanted = incompleteByKind[kind] || [];
    const label = INCOMPLETE_KINDS.find((k) => k.key === kind)?.label || kind;
    if (!wanted.length) {
      setSaveMsg(`✅ No rows match "${label}".`);
      setTimeout(() => setSaveMsg(""), 2600);
      return;
    }
    setSelected((prev) => {
      const next = add ? new Set(prev) : new Set();
      wanted.forEach((i) => next.add(i));
      return next;
    });
    setSaveMsg(`⚠️ ${add ? "Added" : "Selected"} ${wanted.length} incomplete row(s): ${label}.`);
    setTimeout(() => setSaveMsg(""), 3200);
  };

  /* Bulk delete always asks first — it can take many rows (and their photos)
     in one click. */
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  /* Merge one patch into every selected row in a SINGLE pass, then clear the
     save-error marks the change just answered, and keep the trailing empty
     line. Selection is kept on purpose: a note is usually action AND remark AND
     date on the same rows, applied one after another. */
  const applyBulk = (mapFn, changedFields = []) => {
    if (!selected.size) return;
    setRows((prev) => {
      const next = prev.map((r, i) =>
        selected.has(i) && rowHasData(r) ? { ...r, ...mapFn(r) } : r
      );
      if (next.length && rowHasData(next[next.length - 1])) next.push(makeEmptyRow());
      return next;
    });
    if (changedFields.length) {
      setRowErrors((prev) => {
        const next = { ...prev };
        selected.forEach((i) => {
          if (!next[i]) return;
          next[i] = { ...next[i] };
          changedFields.forEach((f) => delete next[i][f]);
          if (!Object.keys(next[i]).length) delete next[i];
        });
        return next;
      });
    }
  };

  const flashBulk = (msg) => {
    setSaveMsg(`✅ ${msg} on ${selectedCount} row(s).`);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const bulkSetDate = (date) => {
    applyBulk(() => ({ expiry: date }), ["expiry"]);
    flashBulk("Expiry date set");
  };
  const bulkSetAction = (action, customAction = "") => {
    applyBulk(
      () =>
        action === "Other..."
          ? { action, customAction }
          : { action, customAction: "" },
      ["action"]
    );
    flashBulk("Action set");
  };
  /* mode: "set" replaces the remark, "add" merges without dropping what a row
     already carries (deduped, case-blind - the same list logic the picker uses). */
  const bulkSetRemarks = (value, mode = "set") => {
    if (mode === "add") {
      applyBulk((r) => {
        const list = splitRemarks(r.remarks);
        splitRemarks(value).forEach((x) => {
          if (!list.some((y) => y.toLowerCase() === x.toLowerCase())) list.push(x);
        });
        return { remarks: joinRemarks(list) };
      }, ["remarks"]);
      flashBulk("Remark added");
    } else {
      applyBulk(() => ({ remarks: value }), ["remarks"]);
      flashBulk("Remark set");
    }
  };
  const bulkSetBranch = (branch, customButchery = "") => {
    applyBulk(
      () =>
        branch === OTHER_BRANCH
          ? { butchery: branch, customButchery }
          : { butchery: branch, customButchery: "" },
      ["butchery"]
    );
    flashBulk("Branch set");
  };
  const bulkSetTransferNo = (transferNo) => {
    applyBulk(() => ({ transferNo }), ["transferNo"]);
    flashBulk("Transfer no set");
  };

  const deleteSelected = () => {
    if (!selected.size) return;
    const orphans = [];
    const kept = rows.filter((r, i) => {
      if (selected.has(i) && rowHasData(r)) {
        safeArr(r.images).forEach((u) => orphans.push(u));
        return false;
      }
      return true;
    });
    if (!kept.length || rowHasData(kept[kept.length - 1])) kept.push(makeEmptyRow());
    setRows(kept);
    setRowErrors({});
    clearSelection();
    orphans.forEach((url) => deleteImage(url).catch(() => {}));
    setSaveMsg("🗑 Removed the selected rows.");
    setTimeout(() => setSaveMsg(""), 2800);
  };

  /* ===== Images ===== */
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);
  const openImagesFor = (idx) => {
    setImageRowIndex(idx);
    setImageModalOpen(true);
  };
  const closeImages = () => setImageModalOpen(false);

  const addImagesToRow = async (urls) => {
    if (imageRowIndex < 0) return;
    setRows((prev) =>
      prev.map((r, i) => (i === imageRowIndex ? { ...r, images: [...safeArr(r.images), ...urls] } : r))
    );
    setSaveMsg("✅ Images added.");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;
    try {
      const url = rows?.[imageRowIndex]?.images?.[imgIndex];
      if (url) {
        try {
          await deleteImage(url);
        } catch {
          // ignore
        }
      }
      setRows((prev) =>
        prev.map((r, i) => {
          if (i !== imageRowIndex) return r;
          const next = safeArr(r.images).slice();
          next.splice(imgIndex, 1);
          return { ...r, images: next };
        })
      );
      setSaveMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Failed to remove image.");
    } finally {
      setTimeout(() => setSaveMsg(""), 2000);
    }
  };

  /* ===== Duplicate rows: find them, and offer to fold them into one ===== */
  const dupGroups = useMemo(() => findDuplicateGroups(rows), [rows]);

  /* row index -> {copies, rank} so the table can mark every copy and say which
     one of how many it is, without searching the groups again per row. */
  const dupMarks = useMemo(() => {
    const m = new Map();
    dupGroups.forEach((idxs) => {
      idxs.forEach((i, rank) => m.set(i, { copies: idxs.length, rank: rank + 1 }));
    });
    return m;
  }, [dupGroups]);

  const dupRowCount = dupMarks.size;

  const mergeDuplicates = () => {
    if (!dupGroups.length) return;

    const drop = new Set();
    const replace = new Map();
    dupGroups.forEach((idxs) => {
      replace.set(idxs[0], mergeRowGroup(rows, idxs));
      idxs.slice(1).forEach((i) => drop.add(i));
    });

    const merged = rows
      .map((r, i) => (replace.has(i) ? replace.get(i) : r))
      .filter((_, i) => !drop.has(i));

    // the table always keeps one empty line at the bottom to type into
    if (!merged.length || rowHasData(merged[merged.length - 1])) merged.push(makeEmptyRow());

    setRows(merged);
    setRowErrors({});
    setSelected(new Set());
    setSaveMsg(
      `✅ Merged ${drop.size} duplicate row(s) into ${dupGroups.length} line(s) — the quantities were added up.`
    );
    setTimeout(() => setSaveMsg(""), 5000);
  };

  /* ===== ✅ Summary: row count + total quantities ===== */
  const summary = useMemo(() => {
    const filledRows = rows.filter(rowHasData);
    let totalKG = 0;
    let totalPCS = 0;
    let totalPLATE = 0;
    let totalOther = 0;

    filledRows.forEach((r) => {
      const qty = Number(r.quantity);
      if (!Number.isFinite(qty) || qty <= 0) return;
      const type = r.qtyType === OTHER_QTY ? (r.customQtyType || "Other") : r.qtyType;
      if (type === "KG") totalKG += qty;
      else if (type === "PCS") totalPCS += qty;
      else if (type === "PLATE") totalPLATE += qty;
      else totalOther += qty;
    });

    /* How many started rows are actually finished, and how the report splits
       across actions. Both read off the very rules the table paints with, so
       the bar under the table can never disagree with the colours in it. */
    const doneRows = filledRows.filter((r) => !Object.keys(missingIn(r)).length).length;

    const counts = new Map();
    filledRows.forEach((r) => {
      const a = String(r.action || "").trim();
      if (!a) return;
      counts.set(a, (counts.get(a) || 0) + 1);
    });
    const actions = [...counts.entries()]
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));

    return { filledRows: filledRows.length, doneRows, actions, totalKG, totalPCS, totalPLATE, totalOther };
  }, [rows]);

  /* ===== Save ===== */
  const handleSave = async (opts = {}) => {
    if (saving) return;

    const prepared = rows.map((r) => {
      const qNum = Number(r.quantity);
      return {
        ...r,
        itemCode: String(r.itemCode || "").trim(),
        productName: String(r.productName || "").trim(),
        origin: String(r.origin || "").trim(),
        butchery: String(r.butchery || "").trim(),
        customButchery: String(r.customButchery || "").trim(),
        transferNo: String(r.transferNo || "").trim(),
        quantity: Number.isFinite(qNum) && qNum > 0 ? qNum : "",
        qtyType: String(r.qtyType || "").trim(),
        customQtyType: String(r.customQtyType || "").trim(),
        expiry: String(r.expiry || "").trim(),
        remarks: String(r.remarks || "").trim(),
        action: String(r.action || "").trim(),
        customAction: String(r.customAction || "").trim(),
        images: safeArr(r.images),
      };
    });

    const errors = validateBeforeSave(prepared);
    if (Object.keys(errors).length) {
      setRowErrors(errors);
      const badRows = Object.keys(errors)
        .map((k) => Number(k) + 1)
        .sort((a, b) => a - b);
      const badFields = [...new Set(Object.values(errors).flatMap((e) => Object.keys(e)))]
        .map((f) => SAVE_FIELD_LABEL[f] || f)
        .join("/");
      setSaveMsg(`❌ Missing required fields in rows: ${badRows.join(", ")} (${badFields}).`);
      setTimeout(() => setSaveMsg(""), 4500);
      return;
    }

    const filtered = prepared.filter((r) => {
      const hasKey = !!(r.itemCode || r.productName);
      const hasMeaningful =
        r.origin ||
        r.butchery ||
        r.customButchery ||
        r.transferNo ||
        r.quantity !== "" ||
        r.expiry ||
        r.remarks ||
        r.action ||
        r.customAction ||
        (r.images && r.images.length > 0);
      return hasKey && hasMeaningful;
    });

    if (!filtered.length) {
      setSaveMsg("Nothing to save. Add an item code or a product name with some data.");
      setTimeout(() => setSaveMsg(""), 2500);
      return;
    }

    /* The day is already on file and this PUT replaces it — make that a
       decision rather than a side effect. Asked only after validation, so the
       prompt never appears for a save that was going to fail anyway. */
    if (dateAlreadyFiled && !opts.replaceConfirmed) {
      setReplacePrompt(true);
      return;
    }
    setReplacePrompt(false);

    try {
      setSaving(true);
      setSaveMsg("⏳ Saving to server…");

      const res = await saveReturnsReport({
        reportDate,
        items: filtered,
        checkedBy: checkedBy.trim(),
        verifiedBy: verifiedBy.trim(),
      });

      // ✅ Mark as saved → clear dirty flag
      savedRowsRef.current = JSON.stringify({ rows, checkedBy, verifiedBy });
      setIsDirty(false);

      /* This date is now on file — and this session is the one that filed it,
         so a follow-up correction saves without being asked again. */
      setFiledDates((prev) => (prev ? new Set(prev).add(reportDate) : prev));
      setSavedHere((prev) => new Set(prev).add(reportDate));
      rememberFiledDate("returns", reportDate);

      // ✅ Clear draft from localStorage after successful server save
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_DATE_KEY);
        /* The names stay on the screen for the sheet that was just saved, but
           they are dropped from the draft: a verifier signs one day's report,
           never tomorrow's by inheritance. */
        localStorage.removeItem(DRAFT_SIGN_KEY);
      } catch { /* ignore */ }

      const saved = res?.report || {};
      const ref = saved?.payload?.refNo || saved?.id || "—";
      setSaveMsg(
        res?.method === "update"
          ? `✅ Updated the report for this date. Reference: ${ref}`
          : `✅ Saved successfully. Reference: ${ref}`
      );
      setSendPromptDate(reportDate);
    } catch (err) {
      setSaveMsg("❌ Save failed. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3800);
    }
  };

  /* ===== Images modal ===== */
  const currentRowForImages = imageRowIndex >= 0 ? rows?.[imageRowIndex] || {} : null;


  /* Roomier than it was: the row heights below and the type sizes in RET_CSS
     were raised together, because raising one without the other only makes the
     table look cramped in the other direction. Compact mode is still the
     tighter of the two - it just no longer means small. */
  const th = (w) => ({
    padding: compact ? "13px 8px" : "17px 10px",
    textAlign: "center",
    fontSize: compact ? "0.95em" : "1.05em",
    fontWeight: "bold",
    borderBottom: "2px solid #d8b4fe",
    width: w,
  });

  const td = {
    padding: compact ? "11px 8px" : "15px 10px",
    textAlign: "center",
    verticalAlign: "top",
    borderBottom: "1px solid #f3e8ff",
  };

  const input = (hasErr) => ({
    ...inputBase,
    width: "100%",
    boxSizing: "border-box",
    border: hasErr ? "2px solid #ef4444" : inputBase.border,
    background: hasErr ? "#fff1f2" : inputBase.background,
  });

  const selectStyle = (hasErr) => ({
    ...input(hasErr),
    appearance: "auto",
  });

  /* The action box wears the action's own rail, ground and ink. An error
     still wins: a box a save complained about has to stay red, whatever the
     answer inside it says. */
  const actionSelectStyle = (action, hasErr) => {
    const base = selectStyle(hasErr);
    const a = actionStyle(action);
    if (hasErr || !a.line) return base;
    return {
      ...base,
      background: a.bg,
      color: a.ink,
      border: `1.5px solid ${a.line}`,
      borderLeft: `6px solid ${a.line}`,
      fontWeight: 800,
    };
  };

  return (
    <div
      dir="ltr"
      className="rt"
      style={{
        fontFamily: "Cairo, Segoe UI, Roboto, Arial, sans-serif",
        padding: "2.2rem",
        background:
          "radial-gradient(1200px 600px at 100% -10%, #f5d0fe 0%, transparent 60%), linear-gradient(135deg, #f8f5ff 0%, #f0f4ff 50%, #fdf4ff 100%)",
        minHeight: "100vh",
        direction: "ltr",
        textAlign: "left",
      }}
    >
      <style>{RET_CSS}</style>

      {/* Hero header */}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.65))",
          border: "1px solid rgba(255,255,255,.7)",
          borderRadius: 20,
          padding: "18px 24px",
          marginBottom: 18,
          boxShadow: "0 12px 28px rgba(81, 46, 95, 0.15)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="rt-badge"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #884ea0, #c084fc)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              boxShadow: "0 6px 18px rgba(136, 78, 160, .35)",
            }}
          >
            BR
          </div>
          <div>
            <div
              className="rt-title"
              style={{
                fontWeight: 900,
                background: "linear-gradient(90deg, #512e5f, #884ea0)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Returns Register
            </div>
            <div className="rt-sub" style={{ color: "#64748b", fontWeight: 600, marginTop: 2 }}>
              Branch Returns — record returned items received from the branches
            </div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div className="rt-brand" style={{ fontWeight: 800, color: "#b91c1c", letterSpacing: ".5px" }}>AL MAWASHI</div>
          <div className="rt-brand-sub" style={{ color: "#64748b" }}>Trans Emirates Livestock Trading L.L.C.</div>
        </div>
      </div>

      {/* The controlled-document block: what this form IS, before what it says */}
      <DocumentControl reportDate={reportDate} />

      {/* ✅ Unsaved changes banner */}
      {isDirty && (
        <div
          style={{
            background: "linear-gradient(180deg, #fef9c3, #fef08a)",
            border: "1.5px solid #fde047",
            boxShadow: "0 4px 14px rgba(250, 204, 21, .25)",
            borderRadius: 10,
            padding: "8px 16px",
            marginBottom: 12,
            textAlign: "center",
            fontWeight: 800,
            color: "#854d0e",
            fontSize: 14,
          }}
        >
          ⚠️ Unsaved changes — the draft is auto-saved locally
        </div>
      )}

      {/* ═══════════ One toolbar ═══════════
          The date, the four things a person DOES to a report and the two table
          switches used to stand on three stacked rows, and the table started a
          third of the way down the screen. They are one strip now, read left to
          right: the date first, because nothing else means anything without it,
          then the actions, then the switches behind a hairline.

          Anything that is a MESSAGE - a save result, a date already on file, a
          catalog that did not load - is deliberately kept OUT of the strip and
          reported under it. Messages come and go, and a strip that grows a line
          every time one appears moves the buttons under the cursor. */}
      <div className="rt-bar">
        {/* 1 · The day, and the one button that files it */}
        <div className="rt-bar-group">
          <label className="rt-bar-date">
            <span aria-hidden="true">📅</span>
            <span>Report date</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </label>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className={`rt-btn is-save${dateAlreadyFiled ? " is-replace" : ""}`}
            title={
              dateAlreadyFiled
                ? "This date already has a report — you will be asked to confirm"
                : "Save this report"
            }
          >
            {saving ? "⏳ Saving…" : dateAlreadyFiled ? "💾 Save (replaces)" : "💾 Save"}
          </button>
        </div>

        {/* 2 · Every way a line gets INTO the table */}
        <div className="rt-bar-seg" role="group" aria-label="Fill the table">
          <button
            onClick={() => setScanOpen(true)}
            className="rt-seg-btn"
            title="Read the item codes and the branch from photos of the return notes"
          >
            📷 Scan notes
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="rt-seg-btn"
            title="Load a note that was already read — as a file, or pasted in"
          >
            📥 Import note
          </button>
          <button
            onClick={() => {
              setAddItemError("");
              setAddItemOpen(true);
            }}
            className="rt-seg-btn"
            title="Add an item code the catalog does not have yet"
          >
            ➕ Add item
          </button>
        </div>

        {/* 3 · How the table looks, what it knows, and the way out to the archive */}
        <div className="rt-bar-group">
          <button
            onClick={() => setCompact((v) => !v)}
            className={`rt-btn is-ghost${compact ? " is-on" : ""}`}
            aria-pressed={compact}
            title="Tighter rows, so more of the report fits on one screen"
          >
            ↔️ Compact
          </button>

          <span
            className="rt-bar-info"
            title={`${allItems.length} item codes loaded — ${itemsAll.length} from the catalog file, ${customItems.length} added here`}
          >
            🗂️ {allItems.length} items
          </span>

          <span
            className="rt-bar-info"
            title="Copy a block of cells in Excel (item code in the first column, quantity in the second) and paste it onto any row. Enter moves down the same column; Ctrl+D copies the row above."
          >
            ⌨️ Excel paste ⓘ
          </span>

          <button
            onClick={() => navigate("/returns/view")}
            className="rt-btn is-view"
            title="Open the saved returns reports"
          >
            📋 View reports
          </button>
        </div>
      </div>

      {/* Everything the strip refuses to carry: what just happened, and what is
          wrong with the day or the catalog. */}
      {(saveMsg || dateAlreadyFiled || filedDates === false || itemsLoadError) && (
        <div className="rt-notices">
          {saveMsg && (
            <span
              className="rt-note-msg"
              style={{
                color: saveMsg.startsWith("✅")
                  ? "#166534"
                  : saveMsg.startsWith("⏳")
                  ? "#512e5f"
                  : "#b91c1c",
              }}
            >
              {saveMsg}
            </span>
          )}

          {dateAlreadyFiled && (
            <span className="rt-note is-stop">
              🛑 This date already has a saved report — saving will replace it.
              <button
                onClick={() => window.open("/returns/view", "_blank", "noopener")}
                title="Opens in a new tab — nothing typed here is lost"
              >
                View it
              </button>
            </span>
          )}

          {filedDates === false && (
            <span
              className="rt-note is-warn"
              title="The list of already-filed dates could not be read, so this page cannot warn you about overwriting one."
            >
              ⚠️ Could not check which dates are already filed
            </span>
          )}

          {itemsLoadError && <span className="rt-note is-warn">{itemsLoadError}</span>}
        </div>
      )}

      {/* Duplicate rows — said out loud, and foldable in one click. It is a
          suggestion, never automatic: only the person entering knows whether
          the branch really sent the same item twice. */}
      {dupRowCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            background: "linear-gradient(180deg, #fff7ed, #ffedd5)",
            border: "1.5px solid #fdba74",
            borderRadius: 12,
            padding: "10px 16px",
            marginBottom: 12,
            color: "#9a3412",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          <span>
            ⧉ {dupRowCount} row(s) look like the same line entered twice
            {dupGroups.length > 1 ? ` (${dupGroups.length} items)` : ""} — same item,
            branch and unit, with no transfer note, expiry or action telling them apart.
          </span>
          <button
            onClick={mergeDuplicates}
            title="Add the quantities up into the first copy and remove the others — the remarks and the photos of every copy are kept"
            style={{
              background: "linear-gradient(135deg, #c2410c, #f97316)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 900,
              cursor: "pointer",
              padding: "8px 16px",
              boxShadow: "0 2px 8px #fed7aa",
            }}
          >
            ⧉ Merge duplicates
          </button>
        </div>
      )}

      {/* The selection toolbar follows the report: it sticks to the top of the
          screen so a bulk edit can be applied from anywhere in a long sheet.
          (Only works because of the overflow-x:clip rule in RET_CSS.) */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "#f8f5ff", paddingTop: 6 }}>
      {/* Smart select — type row numbers / ranges to tick them without scrolling */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          background: "rgba(255,255,255,.75)",
          border: "1px solid #e9d5ff",
          borderRadius: 12,
          padding: "8px 12px",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 900, color: "#6b21a8", whiteSpace: "nowrap" }}>
          🎯 Smart select
        </span>
        <input
          value={rangeText}
          onChange={(e) => setRangeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              selectByRange(e.ctrlKey || e.metaKey);
            }
          }}
          placeholder="Rows, e.g.  10-20, 25, 30-32"
          title="Type row numbers (the SL.NO column). Ranges like 10-20, single rows and commas all work. Enter = Select, Ctrl+Enter = Add."
          style={{ ...inputBase, flex: "1 1 240px", minWidth: 200, padding: "8px 10px" }}
        />
        <button
          onClick={() => selectByRange(false)}
          disabled={!rangeText.trim()}
          style={{
            background: rangeText.trim() ? "#7c3aed" : "#e9d5ff",
            color: rangeText.trim() ? "#fff" : "#a78bca",
            border: "none",
            borderRadius: 9,
            fontWeight: 800,
            cursor: rangeText.trim() ? "pointer" : "not-allowed",
            padding: "8px 16px",
          }}
        >
          Select
        </button>
        <button
          onClick={() => selectByRange(true)}
          disabled={!rangeText.trim()}
          style={{ ...btnGhost, padding: "8px 14px", opacity: rangeText.trim() ? 1 : 0.5 }}
          title="Add these rows to the current selection"
        >
          + Add
        </button>
        <select
          value=""
          onChange={(e) => { if (e.target.value) selectIncomplete(e.target.value); }}
          disabled={!incompleteByKind.any.length}
          title="Tick the rows Save would reject, by what they are missing"
          style={{
            ...inputBase,
            width: "auto",
            padding: "8px 10px",
            fontWeight: 800,
            color: incompleteByKind.any.length ? "#b45309" : "#94a3b8",
            borderColor: incompleteByKind.any.length ? "#fcd34d" : undefined,
            background: incompleteByKind.any.length ? "#fffbeb" : "#f8fafc",
            cursor: incompleteByKind.any.length ? "pointer" : "not-allowed",
          }}
        >
          <option value="">
            {incompleteByKind.any.length
              ? `⚠️ Select incomplete (${incompleteByKind.any.length})`
              : "✅ All rows complete"}
          </option>
          {INCOMPLETE_KINDS.filter((k) => incompleteByKind[k.key].length).map((k) => (
            <option key={k.key} value={k.key}>
              {k.label} ({incompleteByKind[k.key].length})
            </option>
          ))}
        </select>
        {selectedCount > 0 && (
          <span style={{ color: "#5b21b6", fontWeight: 800, whiteSpace: "nowrap" }}>
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Bulk-edit toolbar — appears once any row is ticked */}
      {selectedCount > 0 && (
        <BulkEditBar
          count={selectedCount}
          onDate={bulkSetDate}
          onAction={bulkSetAction}
          onRemarks={bulkSetRemarks}
          onBranch={bulkSetBranch}
          onTransferNo={bulkSetTransferNo}
          onClear={clearSelection}
          onDelete={() => setConfirmBulkDelete(true)}
        />
      )}
      </div>

      {/* Table */}
      <div
        style={{
          background: "rgba(255,255,255,.85)",
          borderRadius: 18,
          boxShadow: "0 12px 28px rgba(81, 46, 95, 0.10)",
          border: "1px solid rgba(255,255,255,.7)",
          backdropFilter: "blur(6px)",
          padding: 12,
          overflowX: "auto",
        }}
        ref={tableRef}
        onKeyDown={handleTableKeyDown}
        onPaste={handleTablePaste}
      >
        <table
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: 14,
            overflow: "hidden",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            minWidth: 2000,
          }}
        >
          <thead>
            <tr style={{ background: "linear-gradient(180deg, #f3e8ff, #e9d5ff)", color: "#512e5f" }}>
              <th style={th("56px")}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  title={allSelected ? "Unselect all" : "Select all filled rows"}
                  style={{ width: 34, height: 34, cursor: "pointer", accentColor: "#7c3aed" }}
                />
              </th>
              <th style={th("70px")}>SL.NO</th>
              <th style={th("150px")}>ITEM CODE</th>
              <th style={th("280px")}>PRODUCT NAME</th>
              <th style={th("130px")}>ORIGIN</th>
              <th style={th("170px")}>BUTCHERY</th>
              <th style={th("130px")}>TRANSFER NO</th>
              <th style={th("130px")}>QUANTITY</th>
              <th style={th("140px")}>QTY TYPE</th>
              <th style={th("150px")}>EXPIRY</th>
              <th style={th("240px")}>REMARKS</th>
              <th style={th("190px")}>ACTION</th>
              <th style={th("150px")}>IMAGES</th>
              <th style={th("60px")}></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const err = rowErrors[idx] || {};
              const hasData = rowHasData(row);
              /* An untouched row is not "incomplete" - it is the empty line
                 waiting to be typed into, and painting it red would make every
                 report open shouting. Only a row someone has started counts. */
              const missing = hasData ? missingIn(row) : {};
              const done = hasData && !Object.keys(missing).length;
              // a box is marked when it is empty OR when a save complained
              const bad = { ...missing, ...err };
              const dup = dupMarks.get(idx) || null;
              const isSel = selected.has(idx) && hasData;
              return (
                <tr
                  key={idx}
                  data-row={idx}
                  className={
                    "rt-row" +
                    (Object.keys(err).length ? " rt-err" : "") +
                    (done ? " rt-done" : "") +
                    (dup ? " rt-dup" : "") +
                    (isSel ? " rt-sel" : "")
                  }
                  style={{
                    background: Object.keys(err).length
                      ? "#fff1f2"
                      : dup
                      ? "#fff7ed"
                      : done
                      ? DONE_ROW_BG
                      : idx % 2
                      ? "#faf5ff"
                      : "#fff",
                    boxShadow: isSel ? "inset 4px 0 0 #7c3aed" : undefined,
                  }}
                >
                  {/* Row selector for bulk edit — only on rows that carry data */}
                  <td style={td}>
                    {hasData && (
                      <input
                        type="checkbox"
                        checked={selected.has(idx)}
                        onChange={() => toggleSelectRow(idx)}
                        title="Select this row for bulk edit"
                        style={{ width: 34, height: 34, cursor: "pointer", accentColor: "#7c3aed" }}
                      />
                    )}
                  </td>

                  {/* SL.NO doubles as the row's state: a finished row gets the
                      emerald tick, a started one an amber count of the boxes it
                      is still waiting for. Both are small on purpose - the rail
                      down the left edge is what carries at a glance. */}
                  <td style={td}>
                    <div className="rt-sl">
                      <span>{idx + 1}</span>
                      {dup ? (
                        <span
                          className="rt-dupmark"
                          title={`Copy ${dup.rank} of ${dup.copies} of the same line — merge them or tell them apart with the transfer note, the expiry or the action`}
                        >
                          ⧉{dup.rank}
                        </span>
                      ) : null}
                      {done ? (
                        <span className="rt-tick" title="Row complete">✓</span>
                      ) : hasData ? (
                        <span
                          className="rt-left"
                          title={`${Object.keys(missing).length} box(es) still empty on this row`}
                        >
                          {Object.keys(missing).length}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* ITEM CODE — the list lives in a portal, see CodeSuggest */}
                  <td style={td}>
                    <CodeSuggest
                      value={row.itemCode || ""}
                      onChange={(v) => handleChange(idx, "itemCode", v)}
                      onPick={(item) => pickItem(idx, item)}
                      search={localSearch}
                      style={input(!!bad.itemCode)}
                      placeholder="Code or name"
                      inputProps={{ "data-col": "itemCode" }}
                    />

                    {row.itemCode && !allItems.some((it) => normalize(it.item_code) === normalize(row.itemCode)) && (
                      <div className="rt-note" style={{ marginTop: 6, color: "#b45309", fontWeight: 800 }}>
                        Code not found — you can add it via "Add item".
                      </div>
                    )}
                  </td>

                  {/* PRODUCT NAME — filled from the item code, never typed */}
                  <td style={td}>
                    <div
                      title={row.productName || "Enter an item code to fill this in"}
                      style={{
                        ...input(!!bad.productName),
                        width: "100%",
                        boxSizing: "border-box",
                        textAlign: "left",
                        // the red wash from input() has to survive this cell's
                        // own grey, or the one box nobody can type into would
                        // be the only one that never says it is empty
                        background: bad.productName ? "#fff1f2" : "#f8fafc",
                        borderStyle: bad.productName ? "solid" : "dashed",
                        color: row.productName ? "#0f172a" : "#94a3b8",
                        fontWeight: row.productName ? 700 : 500,
                        cursor: "default",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minHeight: 34,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span aria-hidden="true" style={{ opacity: 0.5, flex: "none" }}>🔒</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.productName || "Filled from the item code"}
                      </span>
                    </div>
                  </td>

                  {/* ORIGIN */}
                  <td style={td}>
                    <select
                      data-col="origin"
                      style={selectStyle(!!bad.origin)}
                      value={row.origin || ""}
                      onChange={(e) => handleChange(idx, "origin", e.target.value)}
                    >
                      <option value="">Select origin</option>
                      {ORIGINS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                      {/* keep any value saved before this dropdown existed */}
                      {row.origin && !ORIGINS.includes(row.origin) && (
                        <option value={row.origin}>{row.origin}</option>
                      )}
                    </select>
                  </td>

                  {/* BUTCHERY */}
                  <td style={td}>
                    <select data-col="butchery" style={selectStyle(!!bad.butchery)} value={row.butchery || ""} onChange={(e) => handleChange(idx, "butchery", e.target.value)}>
                      <option value="">Select branch</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>{enLabel(b)}</option>
                      ))}
                    </select>
                    {row.butchery === OTHER_BRANCH && (
                      <input
                        style={{ ...input(!!bad.butchery), marginTop: 6 }}
                        placeholder="Enter branch name"
                        value={row.customButchery || ""}
                        onChange={(e) => handleChange(idx, "customButchery", e.target.value)}
                      />
                    )}
                  </td>

                  {/* TRANSFER NO */}
                  <td style={td}>
                    <input
                      data-col="transferNo"
                      style={input(!!bad.transferNo)}
                      inputMode="numeric"
                      placeholder="e.g. 02323"
                      title="Typed once, it fills every row of the same branch in this report"
                      value={row.transferNo || ""}
                      onChange={(e) => handleChange(idx, "transferNo", e.target.value)}
                      onBlur={() => propagateTransferNo(idx)}
                    />
                  </td>

                  {/* QUANTITY — the weight printed on the branch transfer note */}
                  <td style={td}>
                    <input
                      data-col="quantity"
                      type="number"
                      min="0"
                      step="0.001"
                      style={input(!!bad.quantity)}
                      placeholder="Qty"
                      title="The quantity printed on the branch transfer note"
                      value={row.quantity}
                      onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                    />
                  </td>

                  {/* QTY TYPE */}
                  <td style={td}>
                    <select data-col="qtyType" style={selectStyle(!!bad.qtyType)} value={row.qtyType} onChange={(e) => handleChange(idx, "qtyType", e.target.value)}>
                      {QTY_TYPES.map((q) => (
                        <option key={q} value={q}>{enLabel(q)}</option>
                      ))}
                    </select>
                    {row.qtyType === OTHER_QTY && (
                      <input
                        style={{ ...input(!!bad.qtyType), marginTop: 6 }}
                        placeholder="Enter type"
                        value={row.customQtyType}
                        onChange={(e) => handleChange(idx, "customQtyType", e.target.value)}
                      />
                    )}
                  </td>

                  {/* EXPIRY */}
                  <td style={td}>
                    <input
                      data-col="expiry"
                      type="date"
                      style={input(!!bad.expiry)}
                      value={row.expiry}
                      onChange={(e) => handleChange(idx, "expiry", e.target.value)}
                    />
                  </td>

                  {/* REMARKS */}
                  <td style={td}>
                    <RemarksPicker
                      value={row.remarks || ""}
                      onChange={(v) => handleChange(idx, "remarks", v)}
                      invalid={!!bad.remarks}
                    />
                  </td>

                  {/* ACTION - the box wears the chosen action's colours */}
                  <td style={td}>
                    <select
                      data-col="action"
                      style={actionSelectStyle(row.action, !!bad.action)}
                      value={row.action}
                      onChange={(e) => handleChange(idx, "action", e.target.value)}
                    >
                      <option value="">Select action</option>
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>{`${ACTION_STYLE[a].mark} ${a}`}</option>
                      ))}
                    </select>
                    {row.action === "Other..." && (
                      <input
                        /* the box the action is actually typed into belongs to
                           the same "Other" colour as the dropdown above it */
                        style={{ ...actionSelectStyle(row.action, !!bad.action), marginTop: 6, appearance: "none" }}
                        placeholder="Enter custom action"
                        value={row.customAction}
                        onChange={(e) => handleChange(idx, "customAction", e.target.value)}
                      />
                    )}
                  </td>

                  {/* Images */}
                  <td style={td}>
                    <PhotoButton
                      images={safeArr(row.images)}
                      onClick={() => openImagesFor(idx)}
                    />
                  </td>

                  {/* Delete row (with confirmation) */}
                  <td style={td}>
                    {rows.length > 1 && (
                      <button
                        onClick={() => requestRemoveRow(idx)}
                        style={{
                          background: "#c0392b",
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          fontWeight: "bold",
                          fontSize: 18,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                        title="Delete row"
                      >
                        ✖
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ✅ Summary bar */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={summaryChip("#512e5f", "#f5eeff")}>
          📝 Filled rows: <strong>{summary.filledRows}</strong> / {rows.length}
        </div>
        {summary.totalKG > 0 && (
          <div style={summaryChip("#155e75", "#ecfeff")}>
            ⚖️ Total KG: <strong>{summary.totalKG.toFixed(2)}</strong>
          </div>
        )}
        {summary.totalPCS > 0 && (
          <div style={summaryChip("#065f46", "#ecfdf5")}>
            📦 Total PCS: <strong>{summary.totalPCS}</strong>
          </div>
        )}
        {summary.totalPLATE > 0 && (
          <div style={summaryChip("#5b21b6", "#f5f3ff")}>
            🍽️ Total PLATE: <strong>{summary.totalPLATE}</strong>
          </div>
        )}
        {summary.totalOther > 0 && (
          <div style={summaryChip("#7c2d12", "#fff7ed")}>
            🔢 Other: <strong>{summary.totalOther.toFixed(2)}</strong>
          </div>
        )}
      </div>

      {/* How far the report is from finished, and what it is made of. The
          bar answers the question the green rows answer one at a time -
          am I done - without scrolling the table; the chips under it say
          in the same colours the ACTION column uses where the returns
          went. Both disappear on an untouched report, which has nothing
          to report yet. */}
      {summary.filledRows > 0 && (
        <div className="rt-progress">
          <div className="rt-progress-head">
            <span>
              {summary.doneRows === summary.filledRows
                ? "✓ Every started row is complete"
                : "Rows complete"}
            </span>
            <span>
              <strong>{summary.doneRows}</strong> / {summary.filledRows}
            </span>
          </div>
          <div className="rt-progress-track">
            <div
              className="rt-progress-fill"
              style={{
                width: `${Math.round((summary.doneRows / Math.max(1, summary.filledRows)) * 100)}%`,
              }}
            />
          </div>

          {summary.actions.length > 0 && (
            <div className="rt-legend">
              {summary.actions.map(({ action, count }) => {
                const a = actionStyle(action);
                return (
                  <span
                    key={action}
                    className="rt-chip"
                    style={{
                      background: a.bg || "#f8fafc",
                      color: a.ink || "#0f172a",
                      borderColor: a.line || "#e2e8f0",
                      borderLeftColor: a.line || "#e2e8f0",
                    }}
                  >
                    <span aria-hidden="true">{a.mark}</span>
                    {action}
                    <b style={{ background: a.line || "#94a3b8" }}>{count}</b>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "1.3rem", textAlign: "center" }}>
        <button
          onClick={addRow}
          style={{
            background: "linear-gradient(135deg, #512e5f, #884ea0)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontWeight: "bold",
            fontSize: "1.08em",
            padding: "12px 30px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de",
          }}
        >
          ➕ Add new row
        </button>
      </div>

      {/* ═══ Signatures ═══
          The two names a controlled record closes with: whoever filled the
          sheet in, and whoever checked it afterwards. They are saved inside
          the report, so the view and the Excel backup print the same pair. */}
      <div
        style={{
          marginTop: 22,
          background: "rgba(255,255,255,.9)",
          border: "1px solid #ddd0e8",
          borderRadius: 14,
          padding: "14px 18px",
          boxShadow: "0 6px 18px rgba(81, 46, 95, .07)",
        }}
      >
        <div style={{ fontWeight: 900, color: "#512e5f", marginBottom: 10, fontSize: 14 }}>
          ✍️ Signatures
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <label style={{ display: "block", fontWeight: 800, color: "#475569", marginBottom: 5, fontSize: 13 }}>
              Checked By
            </label>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              placeholder="Name of the person who filled this sheet in"
              style={{ ...inputBase, width: "100%" }}
            />
          </div>
          <div style={{ minWidth: 240, flex: 1 }}>
            <label style={{ display: "block", fontWeight: 800, color: "#475569", marginBottom: 5, fontSize: 13 }}>
              Verified By
            </label>
            <input
              type="text"
              value={verifiedBy}
              onChange={(e) => setVerifiedBy(e.target.value)}
              placeholder="Name of the person who checked it"
              style={{ ...inputBase, width: "100%" }}
            />
          </div>
        </div>
        <div style={{ marginTop: 8, color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>
          Both names are saved with the report and printed on the Excel backup.
        </div>
      </div>

      <ReturnNoteScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        branches={BRANCHES.filter((b) => b !== OTHER_BRANCH)}
        catalog={catalogByDigits}
        onApply={applyScan}
      />

      <ReturnNoteImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        branches={BRANCHES.filter((b) => b !== OTHER_BRANCH)}
        catalog={catalogByDigits}
        onApply={applyScan}
      />

      <ImageManagerModal
        open={imageModalOpen}
        row={currentRowForImages}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
      />

      <AddItemModal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        onAdd={handleAddNewItem}
        error={addItemError}
      />

      {/* ✅ Confirm Delete Modal */}
      <ConfirmDeleteModal
        show={confirmDelete.show}
        rowNum={confirmDelete.idx + 1}
        imageCount={safeArr(rows?.[confirmDelete.idx]?.images).length}
        onConfirm={confirmRemoveRow}
        onCancel={cancelRemoveRow}
      />

      {/* Confirm before deleting every selected row */}
      {(() => {
        const idxs = [...selected].filter((i) => i < rows.length && rowHasData(rows[i])).sort((a, b) => a - b);
        const photos = idxs.reduce((n, i) => n + safeArr(rows[i]?.images).length, 0);
        const nums = idxs.slice(0, 15).map((i) => i + 1).join(", ") + (idxs.length > 15 ? ", …" : "");
        return (
          <ConfirmDeleteModal
            show={confirmBulkDelete && idxs.length > 0}
            title={`Delete ${idxs.length} selected row${idxs.length === 1 ? "" : "s"}?`}
            message={<>Rows: <b style={{ color: "#0f172a" }}>{nums}</b><br />This cannot be undone.</>}
            imageCount={photos}
            onCancel={() => setConfirmBulkDelete(false)}
            onConfirm={() => { setConfirmBulkDelete(false); deleteSelected(); }}
          />
        );
      })()}

      {/* The chosen day is already on file — confirm before replacing it */}
      <ReplaceDayModal
        show={replacePrompt}
        reportDate={reportDate}
        rowCount={summary.filledRows}
        onCancel={() => setReplacePrompt(false)}
        onConfirm={() => {
          setReplacePrompt(false);
          handleSave({ replaceConfirmed: true });
        }}
      />

      {/* ✅ Offer to email the report right after a successful save */}
      <SendReportPrompt
        show={!!sendPromptDate}
        reportDate={sendPromptDate}
        onNo={() => setSendPromptDate("")}
        onYes={() => {
          const d = sendPromptDate;
          setSendPromptDate("");
          navigate(`/returns/browse?tab=browse&d=${encodeURIComponent(d)}&email=1`);
        }}
      />
    </div>
  );
}

/* ====== Styles ====== */
/* globals.css forces `#root *` to 14px and `#root table *` to 12px with !important,
   so the sizes below have to be re-stated through a doubled page class. */
const RET_CSS = `
/* position:sticky is dead app-wide because globals.css puts overflow-x:hidden
   on html/body/#root, which turns them into (never-scrolling) scroll
   containers. Re-enable it just for this page with overflow-x:clip, which
   clips the same horizontal overflow WITHOUT making a scroll container, so the
   sticky selection toolbar (and the table header) can pin to the top. Old
   browsers drop the line and the toolbar degrades to a normal block. */
html:has(.rt), body:has(.rt), #root:has(.rt) { overflow-x: clip; }

#root .rt.rt .rt-title { font-size: 22px !important; }
#root .rt.rt .rt-sub { font-size: 13px !important; }
#root .rt.rt .rt-brand { font-size: 14px !important; }
#root .rt.rt .rt-brand-sub { font-size: 10px !important; }
#root .rt.rt .rt-badge { font-size: 20px !important; }

/* ===== Bigger, bolder table type =====
   globals.css pins EVERYTHING inside a table to 12px !important, and an inline
   style cannot beat an !important rule - so the readable size has to be won
   back here, through the doubled .rt.rt class, which out-specifies it. The
   row heights that go with these sizes are the td/th padding in the component;
   raising one without the other only makes the table cramped the other way. */
#root .rt.rt table th,
#root .rt.rt table th * { font-size: 16px !important; font-weight: 900 !important; }
/* "td *" and not just "td": almost nothing in these cells is text sitting
   directly in the cell - it is an input, a select, or the locked product-name
   div - and globals.css reaches every one of them by descendant selector. */
#root .rt.rt table td,
#root .rt.rt table td * { font-size: 16px !important; font-weight: 700 !important; }
/* the picked-remark chips and the notes under a cell stay a step down, or a
   row carrying three remarks grows taller than the screen. One class more
   than the rule above, so it wins without another !important war. */
#root .rt.rt table td .rt-note,
#root .rt.rt table td .rt-note * { font-size: 13px !important; }

/* the row under the mouse (or holding the caret) lights up */
#root .rt.rt tbody tr.rt-row { transition: background .15s ease, box-shadow .15s ease; }
#root .rt.rt tbody tr.rt-row:hover,
#root .rt.rt tbody tr.rt-row:focus-within {
  background: #f1e4ff !important;
  box-shadow: inset 4px 0 0 0 #a855f7;
}
#root .rt.rt tbody tr.rt-row.rt-err:hover,
#root .rt.rt tbody tr.rt-row.rt-err:focus-within {
  background: #ffe4e6 !important;
  box-shadow: inset 4px 0 0 0 #ef4444;
}
#root .rt.rt tbody tr.rt-row:hover td:first-child,
#root .rt.rt tbody tr.rt-row:focus-within td:first-child {
  color: #7e22ce;
  font-weight: 900;
}
#root .rt.rt tbody tr.rt-row:hover input,
#root .rt.rt tbody tr.rt-row:hover select,
#root .rt.rt tbody tr.rt-row:focus-within input,
#root .rt.rt tbody tr.rt-row:focus-within select { background: #fff; }

#root .rt.rt input:focus,
#root .rt.rt select:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, .18);
}

/* ===== A finished row =====
   It used to turn a flat, shouting #22c55e - a slab of colour the eye had to
   read through to reach the values on it. What replaced it says the same
   thing with three quieter marks that stack: an emerald rail down the left
   edge (the part that carries while scrolling a long report), a mint wash
   that fades out to white across the row so the boxes stay readable, and a
   tick badge on the number. The wash still has to beat the generic hover rule
   above - that one carries !important - or a finished row would turn ordinary
   the moment it was pointed at; hover only deepens the mint, so pointing at a
   row never reads as un-finishing it.

   The flash is the reward: the moment the last box is answered the class
   lands and the row lights up once, then settles. A CSS animation outranks an
   inline style, which is why it can repaint a background React set inline. */
@keyframes rtDoneFlash {
  0%   { background: linear-gradient(90deg, #6ee7b7 0%, #a7f3d0 55%, #d1fae5 100%); }
  60%  { background: linear-gradient(90deg, #bbf7d0 0%, #e4fbef 50%, #f4fffa 100%); }
  100% { background: linear-gradient(90deg, #dcfce7 0%, #f0fdf7 42%, #ffffff 100%); }
}
#root .rt.rt tbody tr.rt-row.rt-done {
  box-shadow: inset 5px 0 0 0 #10b981;
  animation: rtDoneFlash .5s ease-out both;
}
#root .rt.rt tbody tr.rt-row.rt-done:hover,
#root .rt.rt tbody tr.rt-row.rt-done:focus-within {
  background: linear-gradient(90deg, #bbf7d0 0%, #dcfce7 45%, #f6fffb 100%) !important;
  box-shadow: inset 5px 0 0 0 #059669;
}
#root .rt.rt tbody tr.rt-row.rt-done td { color: #064e3b; }
#root .rt.rt tbody tr.rt-row.rt-done:hover td:first-child,
#root .rt.rt tbody tr.rt-row.rt-done:focus-within td:first-child {
  color: #065f46;
  font-weight: 900;
}

/* ===== The state badge in SL.NO =====
   globals.css pins every descendant of a table to 12px !important, so these
   two badges have to re-state their own size through the doubled page class,
   the same way the cells above do. */
#root .rt.rt .rt-sl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  line-height: 1;
}
#root .rt.rt .rt-tick {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #34d399, #059669);
  color: #fff !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  box-shadow: 0 2px 6px rgba(5, 150, 105, .40);
  animation: rtTickIn .34s cubic-bezier(.2, 1.5, .45, 1) both;
}
@keyframes rtTickIn {
  from { transform: scale(.2); opacity: 0; }
  to   { transform: scale(1);  opacity: 1; }
}
/* A started row says how many boxes it is still waiting for - the same count
   the red outlines already show, gathered into one number so it can be read
   without hunting across thirteen columns. */
#root .rt.rt .rt-left {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #fff7ed;
  border: 1.5px solid #fdba74;
  color: #b45309 !important;
  font-size: 12px !important;
  font-weight: 900 !important;
}

/* ===== Progress + action breakdown under the table ===== */
#root .rt.rt .rt-progress {
  margin: 18px auto 0;
  max-width: 720px;
  background: rgba(255, 255, 255, .78);
  border: 1px solid #ede9fe;
  border-radius: 18px;
  padding: 14px 18px 16px;
  box-shadow: 0 8px 24px rgba(81, 46, 95, .08);
  backdrop-filter: blur(6px);
}
#root .rt.rt .rt-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: #065f46;
  font-weight: 800;
  font-size: 14px !important;
  margin-bottom: 8px;
}
#root .rt.rt .rt-progress-track {
  height: 10px;
  border-radius: 999px;
  background: #ede9fe;
  overflow: hidden;
}
#root .rt.rt .rt-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6ee7b7, #10b981, #047857);
  box-shadow: 0 0 10px rgba(16, 185, 129, .5);
  transition: width .35s ease;
}
#root .rt.rt .rt-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
#root .rt.rt .rt-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid;
  border-left-width: 5px;
  border-radius: 999px;
  padding: 6px 12px 6px 10px;
  font-weight: 800;
  font-size: 13px !important;
}
#root .rt.rt .rt-chip b {
  color: #fff;
  border-radius: 999px;
  min-width: 20px;
  padding: 1px 7px;
  text-align: center;
  font-size: 12px !important;
}

/* ===== A row that is the same line twice =====
   The amber rail is written after the emerald one on purpose: a duplicate can
   also be a complete row, and "this may be entered twice" is the thing the
   person has to see first. */
#root .rt.rt tbody tr.rt-row.rt-dup { box-shadow: inset 5px 0 0 0 #f97316; }
#root .rt.rt tbody tr.rt-row.rt-dup:hover,
#root .rt.rt tbody tr.rt-row.rt-dup:focus-within {
  background: linear-gradient(90deg, #fed7aa 0%, #ffedd5 45%, #fffbf5 100%) !important;
  box-shadow: inset 5px 0 0 0 #ea580c;
}
#root .rt.rt .rt-dupmark {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ffedd5;
  color: #9a3412;
  border: 1px solid #fdba74;
  font-weight: 900;
  font-size: 11px !important;
  line-height: 1;
}

/* ===== The per-row photo control =====
   Two states in one control: an empty row asks for a photo, a row that has
   one shows it. Sized to the 150px IMAGES column, so it must stay compact. */
#root .rt.rt .rt-photo {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 800;
  font-size: 12px !important;
  text-align: left;
  background: #fff;
  border: 1.5px solid #c7d2fe;
  color: #3730a3;
  box-shadow: 0 1px 3px rgba(49, 46, 129, .10);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
}
#root .rt.rt .rt-photo:hover {
  transform: translateY(-1px);
  border-color: #818cf8;
  box-shadow: 0 6px 14px rgba(49, 46, 129, .18);
}
#root .rt.rt .rt-photo:active { transform: translateY(0); }
#root .rt.rt .rt-photo:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }
#root .rt.rt .rt-photo.is-empty {
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  color: #64748b;
  box-shadow: none;
}
#root .rt.rt .rt-photo.is-empty:hover {
  background: #eef2ff;
  border-color: #a5b4fc;
  color: #4338ca;
}
#root .rt.rt .rt-photo-ico { display: grid; place-items: center; flex: 0 0 auto; }
#root .rt.rt .rt-photo-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid #e0e7ff;
  background: #eef2ff;
}
#root .rt.rt .rt-photo-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
#root .rt.rt .rt-photo-badge {
  position: absolute;
  right: -1px;
  bottom: -1px;
  min-width: 16px;
  padding: 0 3px;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font-style: normal;
  font-weight: 900;
  font-size: 10px !important;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 1.5px #fff;
}
#root .rt.rt .rt-photo-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ═══════════ The single toolbar over the table ═══════════
   One strip, three groups: the date, the actions, the switches. It wraps on a
   narrow screen instead of scrolling sideways - a button that has to be
   scrolled to is a button nobody presses. */
#root .rt.rt .rt-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, .88);
  border: 1px solid rgba(216, 199, 231, .85);
  box-shadow: 0 8px 22px rgba(81, 46, 95, .10);
  backdrop-filter: blur(6px);
}
#root .rt.rt .rt-bar-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
/* The three "fill" actions share one outlined pill, so they read as one set */
#root .rt.rt .rt-bar-seg {
  display: inline-flex;
  align-items: stretch;
  height: 38px;
  border: 1.5px solid #ddd0e8;
  border-radius: 11px;
  background: #fff;
  overflow: hidden;
}
#root .rt.rt .rt-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: #512e5f;
  font-weight: 800;
  font-size: 13px !important;
  cursor: pointer;
  white-space: nowrap;
  transition: background .12s ease;
}
#root .rt.rt .rt-seg-btn + .rt-seg-btn { border-left: 1.5px solid #ece3f3; }
#root .rt.rt .rt-seg-btn:hover { background: #f8f3ff; }
#root .rt.rt .rt-seg-btn:active { background: #efe5f8; }
#root .rt.rt .rt-bar-date {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 6px 0 12px;
  border-radius: 11px;
  background: linear-gradient(135deg, #512e5f, #884ea0);
  color: #fff;
  font-weight: 900;
  font-size: 13px !important;
  box-shadow: 0 3px 10px rgba(136, 78, 160, .35);
  white-space: nowrap;
}
#root .rt.rt .rt-bar-date input {
  border: none;
  border-radius: 8px;
  padding: 5px 9px;
  background: rgba(255, 255, 255, .97);
  color: #512e5f;
  font-weight: 800;
  font-size: 13px !important;
}
#root .rt.rt .rt-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 11px;
  color: #fff;
  font-weight: 800;
  font-size: 13px !important;
  cursor: pointer;
  white-space: nowrap;
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
}
#root .rt.rt .rt-btn:hover { transform: translateY(-1px); filter: brightness(1.04); }
#root .rt.rt .rt-btn:active { transform: translateY(0); }
#root .rt.rt .rt-btn:disabled { cursor: not-allowed; filter: grayscale(.35); transform: none; }
#root .rt.rt .rt-btn.is-save { background: linear-gradient(135deg, #16a34a, #22c55e); box-shadow: 0 3px 10px rgba(22, 163, 74, .30); }
#root .rt.rt .rt-btn.is-save.is-replace { background: linear-gradient(135deg, #b45309, #f59e0b); box-shadow: 0 3px 10px rgba(217, 119, 6, .30); }
#root .rt.rt .rt-btn.is-view { background: linear-gradient(135deg, #512e5f, #884ea0); box-shadow: 0 3px 10px rgba(136, 78, 160, .30); }
#root .rt.rt .rt-btn.is-ghost {
  background: #fff;
  color: #512e5f;
  border: 1.5px solid #ddd0e8;
  box-shadow: none;
}
#root .rt.rt .rt-btn.is-ghost:hover { background: #f8f3ff; }
#root .rt.rt .rt-btn.is-ghost.is-on {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}
#root .rt.rt .rt-bar-info {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 38px;
  padding: 0 11px;
  border-radius: 11px;
  background: #f6f1fb;
  border: 1px solid #e4d8ee;
  color: #6b5b7b;
  font-weight: 800;
  font-size: 12px !important;
  cursor: help;
  white-space: nowrap;
}

/* Messages live under the strip, never inside it */
#root .rt.rt .rt-notices {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
#root .rt.rt .rt-note-msg { font-weight: 900; font-size: 13.5px !important; }
#root .rt.rt .rt-note {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 11px;
  padding: 7px 13px;
  font-weight: 800;
  font-size: 13px !important;
}
#root .rt.rt .rt-note.is-stop { background: linear-gradient(180deg, #fee2e2, #fecaca); border: 1.5px solid #f87171; color: #991b1b; }
#root .rt.rt .rt-note.is-warn { background: #fffbeb; border: 1.5px solid #fcd34d; color: #92400e; }
#root .rt.rt .rt-note.is-stop button {
  background: #fff;
  border: 1px solid #fca5a5;
  color: #991b1b;
  border-radius: 8px;
  font-weight: 800;
  font-size: 12px !important;
  cursor: pointer;
  padding: 3px 10px;
}

/* ═══════════ The photo manager window ═══════════ */
#root .rt.rt .rt-im-back {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, .55);
  backdrop-filter: blur(3px);
}
#root .rt.rt .rt-im-card {
  width: min(980px, 100%);
  max-height: 88vh;
  overflow: auto;
  background: #fff;
  border: 1px solid #e9e0f2;
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, .35);
  padding: 0 18px 16px;
}
#root .rt.rt .rt-im-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 -18px 14px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f7f0ff, #eef2ff);
  border-bottom: 1px solid #e9e0f2;
  border-radius: 18px 18px 0 0;
}
#root .rt.rt .rt-im-title { font-weight: 900; font-size: 16px !important; color: #3b2149; }
#root .rt.rt .rt-im-sub { font-weight: 700; font-size: 12px !important; color: #7c6b8a; margin-top: 2px; }
#root .rt.rt .rt-im-headright { display: flex; align-items: center; gap: 10px; }
#root .rt.rt .rt-im-count {
  background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe;
  border-radius: 999px; padding: 4px 12px; font-weight: 900; font-size: 12px !important;
}
#root .rt.rt .rt-im-count.is-full { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
#root .rt.rt .rt-im-x {
  background: #fff; border: 1px solid #e2e8f0; color: #475569;
  border-radius: 10px; width: 32px; height: 32px; font-weight: 900; cursor: pointer;
}
#root .rt.rt .rt-im-x:hover { background: #fee2e2; border-color: #fecaca; color: #b91c1c; }

#root .rt.rt .rt-im-drop {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px;
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, color .15s ease;
}
#root .rt.rt .rt-im-drop:hover { border-color: #a5b4fc; background: #eef2ff; color: #4338ca; }
#root .rt.rt .rt-im-drop.is-over {
  border-color: #6366f1; background: #e0e7ff; color: #3730a3;
  box-shadow: inset 0 0 0 3px rgba(99, 102, 241, .12);
}
#root .rt.rt .rt-im-drop.is-full { border-color: #fdba74; background: #fff7ed; color: #9a3412; cursor: not-allowed; }
#root .rt.rt .rt-im-drop b { display: block; font-size: 14px !important; font-weight: 900; }
#root .rt.rt .rt-im-drop span { display: block; margin-top: 3px; font-size: 12px !important; font-weight: 600; opacity: .85; }

#root .rt.rt .rt-im-prog { margin-top: 12px; }
#root .rt.rt .rt-im-progtxt { font-weight: 800; font-size: 12.5px !important; color: #4338ca; margin-bottom: 5px; }
#root .rt.rt .rt-im-track { height: 8px; border-radius: 999px; background: #e0e7ff; overflow: hidden; }
#root .rt.rt .rt-im-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #818cf8, #4f46e5);
  transition: width .25s ease;
}
#root .rt.rt .rt-im-msg {
  margin-top: 12px; padding: 8px 12px; border-radius: 10px;
  background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;
  font-weight: 800; font-size: 12.5px !important;
}
#root .rt.rt .rt-im-msg.is-warn { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }

#root .rt.rt .rt-im-empty {
  margin-top: 16px; padding: 26px; text-align: center;
  color: #94a3b8; font-weight: 700; font-size: 13px !important;
  border: 1px solid #eef2f7; border-radius: 14px; background: #fcfdff;
}
#root .rt.rt .rt-im-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
#root .rt.rt .rt-im-tile {
  position: relative;
  margin: 0;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e9e0f2;
  background: #f5f3ff;
  box-shadow: 0 2px 8px rgba(81, 46, 95, .10);
}
#root .rt.rt .rt-im-tile img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; }
#root .rt.rt .rt-im-no {
  position: absolute; top: 8px; left: 8px;
  background: rgba(15, 23, 42, .62); color: #fff;
  border-radius: 999px; padding: 1px 9px;
  font-weight: 900; font-size: 11px !important;
}
#root .rt.rt .rt-im-acts {
  position: absolute; inset: auto 0 0 0;
  display: flex; justify-content: flex-end; gap: 6px;
  padding: 8px;
  background: linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,.55));
  opacity: 0;
  transition: opacity .15s ease;
}
#root .rt.rt .rt-im-tile:hover .rt-im-acts,
#root .rt.rt .rt-im-tile:focus-within .rt-im-acts { opacity: 1; }
#root .rt.rt .rt-im-acts button {
  background: rgba(255, 255, 255, .94);
  border: none; border-radius: 9px;
  width: 30px; height: 30px;
  cursor: pointer; font-size: 13px !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, .25);
}
#root .rt.rt .rt-im-acts button.is-danger:hover { background: #fecaca; }
#root .rt.rt .rt-im-ask {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  background: rgba(15, 23, 42, .72);
  color: #fff; text-align: center; padding: 10px;
}
#root .rt.rt .rt-im-ask b { font-size: 13px !important; font-weight: 900; }
#root .rt.rt .rt-im-ask div { display: flex; gap: 8px; }
#root .rt.rt .rt-im-askno,
#root .rt.rt .rt-im-askyes {
  border: none; border-radius: 9px; padding: 6px 14px;
  font-weight: 900; font-size: 12px !important; cursor: pointer;
}
#root .rt.rt .rt-im-askno { background: #fff; color: #334155; }
#root .rt.rt .rt-im-askyes { background: #dc2626; color: #fff; }

#root .rt.rt .rt-im-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  margin-top: 16px; padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  color: #94a3b8; font-weight: 600; font-size: 12px !important;
}
#root .rt.rt .rt-im-done {
  background: linear-gradient(135deg, #512e5f, #884ea0);
  color: #fff; border: none; border-radius: 11px;
  padding: 9px 22px; font-weight: 900; font-size: 13px !important; cursor: pointer;
  box-shadow: 0 2px 10px rgba(136, 78, 160, .35);
}

/* the viewer sits above the window, and the window is already above the page */
#root .rt.rt .rt-im-view {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  background: rgba(2, 6, 23, .9);
  padding: 44px 18px 90px;
}
#root .rt.rt .rt-im-view img {
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .6);
}
#root .rt.rt .rt-im-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255, 255, 255, .12); color: #fff;
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 999px; width: 46px; height: 46px;
  font-size: 26px !important; font-weight: 900; line-height: 1; cursor: pointer;
}
#root .rt.rt .rt-im-nav:hover { background: rgba(255, 255, 255, .25); }
#root .rt.rt .rt-im-nav.is-prev { left: 18px; }
#root .rt.rt .rt-im-nav.is-next { right: 18px; }
#root .rt.rt .rt-im-viewbar {
  position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  background: rgba(15, 23, 42, .85);
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 999px; padding: 8px 14px;
  color: #e2e8f0; font-weight: 800; font-size: 12.5px !important;
}
#root .rt.rt .rt-im-viewbar button {
  background: rgba(255, 255, 255, .12); color: #fff;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 9px; padding: 5px 12px;
  font-weight: 800; font-size: 12px !important; cursor: pointer;
}
#root .rt.rt .rt-im-viewbar button:hover { background: rgba(255, 255, 255, .24); }
`;

const inputBase = {
  /* Taller boxes. The fontSize below is decorative only - globals.css pins
     everything inside a table to 12px !important and an inline size cannot
     beat an !important rule, so the real type size is set in RET_CSS through
     the doubled page class. */
  padding: "12px 12px",
  borderRadius: 10,
  border: "1.5px solid #d8b4fe",
  background: "#fdfaff",
  outline: "none",
  fontSize: "0.98em",
  transition: "border-color .15s, box-shadow .15s, background .15s",
};

const btnPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  padding: "10px 16px",
};

const btnGhost = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  padding: "10px 16px",
};

const hintBox = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 6,
  left: 6,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  boxShadow: "0 8px 20px rgba(0,0,0,.08)",
  zIndex: 60,
  maxHeight: 240,
  overflow: "auto",
};

const hintRow = { padding: "8px 10px", cursor: "pointer" };

const galleryBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const galleryCard = {
  width: "min(1400px, 100vw)",
  maxHeight: "80vh",
  overflow: "auto",
  background: "#fff",
  color: "#111",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
};

const galleryClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};

const btnBlueModal = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
};

const thumbsWrap = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};

const thumbTile = {
  position: "relative",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f8fafc",
};

const thumbImg = { width: "100%", height: 150, objectFit: "cover", display: "block" };

const thumbRemove = {
  position: "absolute",
  top: 6,
  right: 6,
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "2px 8px",
  fontWeight: 800,
  cursor: "pointer",
};

const summaryChip = (color, bg) => ({
  background: bg,
  color,
  border: `1.5px solid ${color}33`,
  borderRadius: 10,
  padding: "6px 14px",
  fontWeight: 700,
  fontSize: 14,
});
