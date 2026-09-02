// src/pages/Returns.js

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchServerItems,
  loadCustomItems,
  saveCustomItems,
} from "./monitor/branches/_shared/ProductPicker";
import ReturnNoteScanner from "./shared/ReturnNoteScanner";
import CodeSuggest from "./shared/CodeSuggest";
import { fetchFiledDates, rememberFiledDate } from "../utils/filedDates";
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
  "Disposed",
  "Separated expired shelf",
  "Other...",
];

const QTY_TYPES = ["KG", "PCS", "PLATE", "أخرى / Other"];

/* REMARKS is picked from a list now, but it is still STORED as a plain
   comma-separated string: BrowseReturns' filters and every Excel/PDF exporter
   read `remarks` as text, and old records already hold free typing. So the
   picker only builds that same string - one row can carry several remarks. */
const REMARK_OPTIONS = ["EXPIRED", "BAD SMELL", "DAMAGE", "NEAR EXP", "CRITICAL"];

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

/* ========= Draft storage key ========= */
const DRAFT_KEY = "returns_draft_v1";
const DRAFT_DATE_KEY = "returns_draft_date_v1";

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
async function saveReturnsReport({ reportDate, items }) {
  const url = `${API_BASE}/api/reports/returns?reportDate=${encodeURIComponent(reportDate)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, _clientSavedAt: Date.now() }),
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
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) {
      setPreviewSrc("");
      setUploadMsg("");
    }
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  if (!open) return null;
  const pick = () => inputRef.current?.click();
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const already = safeArr(row?.images).length;
    const room = Math.max(0, MAX_IMAGES_PER_ROW - already);
    if (room <= 0) {
      setUploadMsg(`This row already has ${MAX_IMAGES_PER_ROW} photos - remove one first.`);
      return;
    }
    const batch = files.slice(0, room);
    const skipped = files.length - batch.length;

    const urls = [];
    let failed = 0;
    for (let i = 0; i < batch.length; i++) {
      setUploadMsg(`Uploading ${i + 1} of ${batch.length}…`);
      try {
        urls.push(await uploadImage(batch[i], "returns_photo"));
      } catch (err) {
        failed++;
        console.error("upload failed:", err);
      }
    }

    if (urls.length) onAddImages(urls);
    const notes = [];
    if (failed) notes.push(`${failed} failed to upload`);
    if (skipped) notes.push(`${skipped} skipped (max ${MAX_IMAGES_PER_ROW} per row)`);
    setUploadMsg(notes.length ? `⚠️ ${notes.join(" - ")}` : "");
    if (!notes.length) setTimeout(() => setUploadMsg(""), 1200);
  };
  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images {row?.productName ? `— ${row.productName}` : ""}
          </div>
          <button onClick={onClose} style={galleryClose}>
            ✕
          </button>
        </div>
        {previewSrc && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img
              src={previewSrc}
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: 700,
                borderRadius: 15,
                boxShadow: "0 6px 18px rgba(0,0,0,.2)",
              }}
            />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={pick} style={btnBlueModal}>
            ⬆️ Upload images
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
          <div style={{ fontSize: 13, color: "#334155" }}>
            Up to {MAX_IMAGES_PER_ROW} photos per item. They are shrunk on this
            device before uploading, then compressed again on the server.
          </div>
          {uploadMsg && (
            <div
              style={{
                fontSize: 13,
                fontWeight: "bold",
                color: uploadMsg.startsWith("⚠️") ? "#b45309" : "#2563eb",
                width: "100%",
              }}
            >
              {uploadMsg}
            </div>
          )}
        </div>
        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile} title={`Image ${i + 1}`}>
                <img src={thumbUrl(src, 320)} alt={`img-${i}`} style={thumbImg} onClick={() => setPreviewSrc(src)} />
                <button title="Remove" onClick={() => onRemoveImage(i)} style={thumbRemove}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Remarks picker (multi-select + free text) ===== */
function RemarksPicker({ value, onChange }) {
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
        style={{ ...inputBase, width: "100%", cursor: "pointer" }}
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
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
function ConfirmDeleteModal({ show, rowNum, imageCount = 0, onConfirm, onCancel }) {
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
          Delete row {rowNum}?
        </div>
        <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          This row contains data. Are you sure you want to delete it?
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
    fetchFiledDates("returns")
      .then((dates) => { if (!cancelled) setFiledDates(new Set(dates)); })
      .catch(() => { if (!cancelled) setFiledDates(false); });
    return () => { cancelled = true; };
  }, []);

  const dateAlreadyFiled =
    !!(filedDates && filedDates.has(reportDate)) && !savedHere.has(reportDate);

  // ✅ Track whether there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const savedRowsRef = useRef(null); // JSON of the last-saved rows

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
      } catch {
        // ignore
      }
      if (savedRowsRef.current !== null) {
        setIsDirty(json !== savedRowsRef.current);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [rows, reportDate]);

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
     our catalog, exactly as it would if the code had been typed by hand. */
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

      entries.forEach(({ code, branch, transferNo, ordered }) => {
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
          quantity: String(ordered ?? ""),
        };
        at++;
      });

      // always leave one empty row to type into
      if (next.length && rowHasData(next[next.length - 1])) next.push(makeEmptyRow());
      return next;
    });

    const pages = new Set(entries.map((e) => e.branch || "?")).size;
    setSaveMsg(
      `✅ ${entries.length} row(s) added from ${pages} scanned branch${pages === 1 ? "" : "es"}.`
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
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const confirmRemoveRow = () => {
    const { idx } = confirmDelete;
    setConfirmDelete({ show: false, idx: -1 });
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

    return { filledRows: filledRows.length, totalKG, totalPCS, totalPLATE, totalOther };
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
      setSaveMsg(`❌ Missing required fields in rows: ${badRows.join(", ")} (Code/Branch/Qty/Action).`);
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

      const res = await saveReturnsReport({ reportDate, items: filtered });

      // ✅ Mark as saved → clear dirty flag
      savedRowsRef.current = JSON.stringify(rows);
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


  const th = (w) => ({
    padding: compact ? "10px 6px" : "13px 7px",
    textAlign: "center",
    fontSize: compact ? "0.95em" : "1.05em",
    fontWeight: "bold",
    borderBottom: "2px solid #d8b4fe",
    width: w,
  });

  const td = {
    padding: compact ? "8px 6px" : "10px 6px",
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

      {/* Catalog load status + add-item button */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span
          style={{
            background: allItems.length ? "#e8f5e9" : "#ffebee",
            color: allItems.length ? "#1b5e20" : "#b71c1c",
            border: "1px solid #eee",
            padding: "6px 10px",
            borderRadius: 10,
            fontWeight: 800,
          }}
        >
          Items loaded: {allItems.length} (base: {itemsAll.length}, custom: {customItems.length})
        </span>

        <button
          onClick={() => {
            setAddItemError("");
            setAddItemOpen(true);
          }}
          style={{ ...btnPrimary, background: "#2563eb", boxShadow: "0 1px 6px #bfdbfe", padding: "8px 14px" }}
          title="Add new item code"
        >
          ➕ Add item
        </button>

        <button
          onClick={() => setCompact((v) => !v)}
          style={{ ...btnGhost, padding: "8px 14px" }}
          title="Toggle compact mode"
        >
          {compact ? "↔️ Compact: ON" : "↔️ Compact: OFF"}
        </button>

        <span
          style={{
            background: "#eef2ff",
            color: "#3730a3",
            border: "1px solid #c7d2fe",
            borderRadius: 10,
            padding: "6px 10px",
            fontWeight: 700,
            fontSize: 12,
          }}
          title="Copy a block of cells in Excel (item code in the first column, quantity in the second) and paste it onto any row. Enter moves down the same column; Ctrl+D copies the row above."
        >
          ⌨️ Paste from Excel · Enter = next row · Ctrl+D = copy row above
        </span>

        {itemsLoadError && <span style={{ color: "#b71c1c", fontWeight: 800 }}>{itemsLoadError}</span>}
      </div>

      {/* Date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <span
          className="rt-datelabel"
          style={{
            background: "linear-gradient(135deg, #884ea0, #a855f7)",
            color: "#fff",
            padding: "9px 16px",
            borderRadius: 14,
            boxShadow: "0 6px 18px rgba(136, 78, 160, .35)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: "bold",
            flexWrap: "wrap",
          }}
        >
          <span role="img" aria-label="calendar">📅</span>
          Report Date:
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{
              background: "rgba(255,255,255,.97)",
              border: "none",
              borderRadius: 9,
              padding: "7px 12px",
              fontWeight: 800,
              color: "#512e5f",
              boxShadow: "0 1px 4px rgba(0,0,0,.10)",
            }}
          />
        </span>

        {dateAlreadyFiled && (
          <span
            style={{
              background: "linear-gradient(180deg, #fee2e2, #fecaca)",
              border: "1.5px solid #f87171",
              color: "#991b1b",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 800,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🛑 This date already has a saved report — saving will replace it.
            <button
              onClick={() => window.open("/returns/view", "_blank", "noopener")}
              style={{
                background: "#fff",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                borderRadius: 8,
                fontWeight: 800,
                cursor: "pointer",
                padding: "3px 9px",
              }}
              title="Opens in a new tab — nothing typed here is lost"
            >
              View it
            </button>
          </span>
        )}

        {filedDates === false && (
          <span
            style={{
              background: "#fffbeb",
              border: "1.5px solid #fcd34d",
              color: "#92400e",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
            }}
            title="The list of already-filed dates could not be read, so this page cannot warn you about overwriting one."
          >
            ⚠️ Could not check which dates are already filed
          </span>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.9rem", marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          title={dateAlreadyFiled ? "This date already has a report — you will be asked to confirm" : "Save this report"}
          style={{
            background: saving
              ? "#7fbf9f"
              : dateAlreadyFiled
              ? "linear-gradient(135deg, #b45309, #f59e0b)"
              : "linear-gradient(135deg, #16a34a, #22c55e)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontWeight: "bold",
            fontSize: "1.02em",
            padding: "10px 26px",
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: dateAlreadyFiled ? "0 2px 8px #fde68a" : "0 2px 8px #d4efdf",
          }}
        >
          {saving ? "Saving…" : dateAlreadyFiled ? "💾 Save (replaces this date)" : "💾 Save"}
        </button>

        <button
          onClick={() => setScanOpen(true)}
          title="Read the item codes and the branch from photos of the return notes"
          style={{
            background: "linear-gradient(135deg, #2563eb, #60a5fa)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontWeight: "bold",
            fontSize: "1.02em",
            padding: "10px 26px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #aed6f1",
          }}
        >
          📷 Scan Return Notes
        </button>

        <button
          onClick={() => navigate("/returns/view")}
          style={{
            background: "linear-gradient(135deg, #884ea0, #a855f7)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontWeight: "bold",
            fontSize: "1.02em",
            padding: "10px 26px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de",
          }}
        >
          📋 View Reports
        </button>

        {saveMsg && (
          <span
            style={{
              marginLeft: 8,
              fontWeight: "bold",
              color: saveMsg.startsWith("✅") ? "#229954" : saveMsg.startsWith("⏳") ? "#512e5f" : "#c0392b",
              fontSize: "1.02em",
              textAlign: "center",
            }}
          >
            {saveMsg}
          </span>
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
            <tr style={{ background: "linear-gradient(180deg, #f3e8ff, #e9d5ff)", color: "#512e5f", position: "sticky", top: 0, zIndex: 5 }}>
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
              return (
                <tr
                  key={idx}
                  data-row={idx}
                  className={"rt-row" + (Object.keys(err).length ? " rt-err" : "")}
                  style={{
                    background: Object.keys(err).length
                      ? "#fff1f2"
                      : idx % 2
                      ? "#faf5ff"
                      : "#fff",
                  }}
                >
                  <td style={td}>{idx + 1}</td>

                  {/* ITEM CODE — the list lives in a portal, see CodeSuggest */}
                  <td style={td}>
                    <CodeSuggest
                      value={row.itemCode || ""}
                      onChange={(v) => handleChange(idx, "itemCode", v)}
                      onPick={(item) => pickItem(idx, item)}
                      search={localSearch}
                      style={input(!!err.itemCode)}
                      placeholder="Code or name"
                      inputProps={{ "data-col": "itemCode" }}
                    />

                    {row.itemCode && !allItems.some((it) => normalize(it.item_code) === normalize(row.itemCode)) && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#b45309", fontWeight: 800 }}>
                        Code not found — you can add it via "Add item".
                      </div>
                    )}
                  </td>

                  {/* PRODUCT NAME — filled from the item code, never typed */}
                  <td style={td}>
                    <div
                      title={row.productName || "Enter an item code to fill this in"}
                      style={{
                        ...input(false),
                        width: "100%",
                        boxSizing: "border-box",
                        textAlign: "left",
                        background: "#f8fafc",
                        borderStyle: "dashed",
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
                      style={selectStyle(false)}
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
                    <select data-col="butchery" style={selectStyle(!!err.butchery)} value={row.butchery || ""} onChange={(e) => handleChange(idx, "butchery", e.target.value)}>
                      <option value="">Select branch</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>{enLabel(b)}</option>
                      ))}
                    </select>
                    {row.butchery === OTHER_BRANCH && (
                      <input
                        style={{ ...input(false), marginTop: 6 }}
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
                      style={input(false)}
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
                      style={input(!!err.quantity)}
                      placeholder="Qty"
                      title="The quantity printed on the branch transfer note"
                      value={row.quantity}
                      onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                    />
                  </td>

                  {/* QTY TYPE */}
                  <td style={td}>
                    <select data-col="qtyType" style={selectStyle(false)} value={row.qtyType} onChange={(e) => handleChange(idx, "qtyType", e.target.value)}>
                      {QTY_TYPES.map((q) => (
                        <option key={q} value={q}>{enLabel(q)}</option>
                      ))}
                    </select>
                    {row.qtyType === OTHER_QTY && (
                      <input
                        style={{ ...input(false), marginTop: 6 }}
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
                      style={input(false)}
                      value={row.expiry}
                      onChange={(e) => handleChange(idx, "expiry", e.target.value)}
                    />
                  </td>

                  {/* REMARKS */}
                  <td style={td}>
                    <RemarksPicker
                      value={row.remarks || ""}
                      onChange={(v) => handleChange(idx, "remarks", v)}
                    />
                  </td>

                  {/* ACTION */}
                  <td style={td}>
                    <select data-col="action" style={selectStyle(!!err.action)} value={row.action} onChange={(e) => handleChange(idx, "action", e.target.value)}>
                      <option value="">Select action</option>
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    {row.action === "Other..." && (
                      <input
                        style={{ ...input(false), marginTop: 6 }}
                        placeholder="Enter custom action"
                        value={row.customAction}
                        onChange={(e) => handleChange(idx, "customAction", e.target.value)}
                      />
                    )}
                  </td>

                  {/* Images */}
                  <td style={td}>
                    <button onClick={() => openImagesFor(idx)} style={btnImg} title="Manage images">
                      🖼️ Images ({safeArr(row.images).length})
                    </button>
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

      <ReturnNoteScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
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
#root .rt.rt .rt-title { font-size: 22px !important; }
#root .rt.rt .rt-sub { font-size: 13px !important; }
#root .rt.rt .rt-brand { font-size: 14px !important; }
#root .rt.rt .rt-brand-sub { font-size: 10px !important; }
#root .rt.rt .rt-badge { font-size: 20px !important; }
#root .rt.rt .rt-datelabel { font-size: 17px !important; }

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
`;

const inputBase = {
  padding: "9px 11px",
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

const btnImg = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
  width: "100%",
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
