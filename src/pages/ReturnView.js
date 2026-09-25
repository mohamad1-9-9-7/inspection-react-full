// src/pages/ReturnView.js
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { uploadImage, deleteImage, thumbUrl } from "../utils/imageUpload";
import { API_BASE } from "../config/api";
import { forgetFiledDate, moveFiledDate } from "../utils/filedDates";
import CodeSuggest from "./shared/CodeSuggest";
import { fetchServerItems } from "./monitor/branches/_shared/ProductPicker";

/* Left date-tree panel: remember whether the user folded it away (UI preference only). */
const TREE_HIDDEN_KEY = "returnView.treeHidden";

/* ===== Cloudinary via server ===== */
async function deleteImagesMany(urls = []) {
  const unique = [...new Set((urls || []).filter(Boolean))];
  if (!unique.length) return { ok: true, deleted: 0, failed: 0 };
  const results = await Promise.allSettled(unique.map((u) => deleteImage(u)));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  return { ok: deleted === results.length, deleted, failed: results.length - deleted };
}
function collectImagesFromItems(items = []) {
  const all = [];
  for (const it of items) if (Array.isArray(it?.images)) for (const u of it.images) if (u) all.push(u);
  return [...new Set(all)];
}

async function fetchReturns() {
  const res = await fetch(API_BASE + "/api/reports?type=returns", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return Array.isArray(json) ? json : (json && json.data ? json.data : []);
}

/* ========== Update a report on server (PUT only) ========== */
/** The part of a report that is not rows, ready to be saved back untouched. */
const sigOf = (rep) => ({
  checkedBy: String(rep?.checkedBy || ""),
  verifiedBy: String(rep?.verifiedBy || ""),
});

/* `meta` carries everything on the report that is NOT a row - today the two
   signatures. It has to be passed back on every edit: the payload is stored
   whole, so a save that leaves the names out erases them. (The returns-only
   fallback route below rebuilds the payload from the items alone and drops
   them regardless, which is why the generic route is tried first.) */
async function saveReportToServer(reportDate, items, meta = {}) {
  const payload = {
    reporter: "anonymous",
    type: "returns",
    payload: { reportDate, items, ...meta, _clientSavedAt: Date.now() },
  };

  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/returns?reportDate=${encodeURIComponent(reportDate)}`,
      method: "PUT",
      body: JSON.stringify({ items, _clientSavedAt: payload.payload._clientSavedAt }),
    },
  ];

  let lastErr = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { "Content-Type": "application/json" },
        body: a.body,
      });
      if (res.ok) {
        try { return await res.json(); } catch { return { ok: true }; }
      }
      lastErr = new Error(`${a.method} ${a.url} -> ${res.status} ${await res.text().catch(() => "")}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Save failed");
}

/* ========== Timestamps helpers ========== */
function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function newer(a, b) {
  const ta = toTs(a?.createdAt) || toTs(a?.updatedAt) || toTs(a?.timestamp) || toTs(a?._id) || toTs(a?.payload?._clientSavedAt) || 0;
  const tb = toTs(b?.createdAt) || toTs(b?.updatedAt) || toTs(b?.timestamp) || toTs(b?._id) || toTs(b?.payload?._clientSavedAt) || 0;
  return tb >= ta ? b : a;
}
function normalizeServerReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec, idx) => {
      const payload = rec?.payload || rec || {};
      return {
        _idx: idx,
        createdAt: rec?.createdAt,
        updatedAt: rec?.updatedAt,
        timestamp: rec?.timestamp,
        _id: rec?._id,
        payload,
        reportDate: payload.reportDate || rec?.reportDate || "",
        items: Array.isArray(payload.items) ? payload.items : [],
        // the two signatures the input sheet closes with
        checkedBy: String(payload.checkedBy || ""),
        verifiedBy: String(payload.verifiedBy || ""),
      };
    })
    .filter((e) => e.reportDate);

  const latest = new Map();
  for (const e of entries) {
    const prev = latest.get(e.reportDate);
    latest.set(e.reportDate, prev ? newer(prev, e) : e);
  }

  return Array.from(latest.values())
    .map((e) => ({
      reportDate: e.reportDate,
      items: e.items,
      checkedBy: e.checkedBy,
      verifiedBy: e.verifiedBy,
    }))
    .sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
}

/* ========== Static lists ========== */
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Condemnation / Cooking",
  "Use in kitchen",
  "Send to market",
  "Disposed",
  "Separated expired shelf",
  "إجراء آخر...",
];

const BRANCHES = [
  "QCS",
  "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16", "POS 17",
  "POS 18", "POS 19", "POS 21", "POS 24", "POS 25", "POS 26", "POS 31",
  "POS 34", "POS 35", "POS 36", "POS 37", "POS 38", "POS 41", "POS 42",
  "POS 43", "POS 44", "POS 45", "POS 47", "POS 48",
  "FTR 1", "FTR 2",
  "KMC", "KPS",
  "W K C",   // ✅ NEW
  "فرع آخر... / Other branch",
];

/* ========== Display/value helpers ========== */
function isOtherBranch(val) {
  const s = String(val || "").toLowerCase();
  return s.includes("other branch") || s.includes("فرع آخر");
}
// Old data sometimes stored the branch as a bare number (e.g. "47" / "48").
// Normalize any bare-number branch to its "POS <n>" form.
function normalizeBranch(val) {
  const s = String(val ?? "").trim();
  if (/^\d+$/.test(s)) return `POS ${s}`;
  return s;
}
function safeButchery(row) {
  return isOtherBranch(row?.butchery) ? row?.customButchery || "" : normalizeBranch(row?.butchery);
}
function actionText(row) {
  return row?.action === "إجراء آخر..." ? row?.customAction || "" : row?.action || "";
}
function round3(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round((v + Number.EPSILON) * 1000) / 1000 : 0;
}
function qtyUnit(row) {
  const t = row?.qtyType;
  return t === "أخرى" || t === "أخرى / Other"
    ? (row?.customQtyType || "")
    : (t || "");
}
function itemKey(row) {
  return [
    (row?.itemCode || "").trim().toLowerCase(),
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}


/* ========== The day a line became a destruction ==========
   A return is written on the day the product came back; what happens to it
   is often decided days later, by editing this very page. Odoo posts the
   condemnation voucher on the day of the DECISION, so a report keeping only
   its own date makes the same event look like two failures in the disposal
   reconciliation: destroyed in Odoo and not by us on one day, and the
   reverse on another.

   So the day of the decision is stamped on the line itself. The change log
   records it too, but a stamp on the row survives without it and is what
   `/disposal-log/compare` reads first. */
const DISPOSAL_ACTION_RE = /(condemn|destro|dispos|discard|إعدام|اعدام|إتلاف|اتلاف|تخلص|إدانة|ادانة)/i;
const isDisposalText = (txt) => DISPOSAL_ACTION_RE.test(String(txt || ""));

/** Today in Dubai — the business day, not the browser's UTC day. */
function businessToday() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Stamp (or clear) the disposal date after an action change. */
function stampActionDate(row, changed) {
  if (!changed) return row;
  if (isDisposalText(row?.action === "إجراء آخر..." || row?.action === "Other..." ? row?.customAction : row?.action)) {
    row.actionDate = businessToday();
  } else {
    delete row.actionDate;
  }
  return row;
}

/* ========== Action-change log ========== */
/** The change entries already recorded for one day (never throws). */
async function readChangeLog(reportDate) {
  try {
    // Targeted read: the server matches the business date, so only this day's
    // change log arrives instead of every change ever recorded.
    const res = await fetch(
      `${API_BASE}/api/reports?type=returns_changes&reportDate=${encodeURIComponent(reportDate)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const arr = Array.isArray(json) ? json : json?.data || [];
    const sameDay = arr.filter((r) => (r?.payload?.reportDate || r?.reportDate) === reportDate);
    if (!sameDay.length) return [];
    sameDay.sort((a, b) => (toTs(b?.updatedAt) || toTs(b?._id) || 0) - (toTs(a?.updatedAt) || toTs(a?._id) || 0));
    const latest = sameDay[0];
    return Array.isArray(latest?.payload?.items) ? latest.payload.items : [];
  } catch {
    return [];
  }
}

async function writeChangeLog(reportDate, items) {
  await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "anonymous",
      type: "returns_changes",
      payload: { reportDate, items, _clientSavedAt: Date.now() },
    }),
  });
}

async function appendActionChange(reportDate, changeItem) {
  const existing = await readChangeLog(reportDate);
  await writeChangeLog(reportDate, [...existing, changeItem]);
}

/* The change log is filed per day as well, so a report that moves to another
   date has to take its history with it - left behind, the entries would hang
   on a day that no longer has a report at all. */
async function moveChangeLog(fromDate, toDate) {
  const from = await readChangeLog(fromDate);
  if (!from.length) return;
  const to = await readChangeLog(toDate);
  await writeChangeLog(toDate, [...to, ...from]);
  try {
    await fetch(
      `${API_BASE}/api/reports?type=returns_changes&reportDate=${encodeURIComponent(fromDate)}`,
      { method: "DELETE" }
    );
  } catch { }
}

/* ========= ✅ Confirm Modal (replaces window.confirm) ========= */
function ConfirmModal({ show, title, message, confirmLabel = "Confirm", confirmColor = "#dc2626", onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4000 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem 2.5rem", minWidth: 320, maxWidth: 420, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,.22)", fontFamily: "Cairo, sans-serif" }}>
        <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontWeight: 900, fontSize: "1.1em", color: "#0f172a", marginBottom: 8 }}>{title}</div>
        <div style={{ color: "#475569", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 12, fontWeight: 900, cursor: "pointer", padding: "10px 24px" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ background: confirmColor, color: "#fff", border: "none", borderRadius: 12, fontWeight: 900, cursor: "pointer", padding: "10px 24px", boxShadow: `0 2px 8px ${confirmColor}55` }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= Images manager modal ========= */
const MAX_IMAGES_PER_PRODUCT = 5;

function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage, remaining }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const [busy, setBusy] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) setPreviewSrc("");
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const allowed = files.slice(0, remaining);
    const urls = [];
    let failed = 0;
    for (let i = 0; i < allowed.length; i++) {
      setBusy(`⏳ Uploading ${i + 1} / ${allowed.length}…`);
      try {
        urls.push(await uploadImage(allowed[i], "returns_photo"));
      } catch (err) {
        failed += 1;
        console.error("upload failed:", err);
      }
    }
    // A silent console.error used to be the only trace of a failed upload.
    setBusy(failed ? `❌ ${failed} of ${allowed.length} image(s) failed to upload.` : "");
    if (failed) setTimeout(() => setBusy(""), 4000);
    if (urls.length) await onAddImages(urls);
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images {row?.productName ? `— ${row.productName}` : ""}
          </div>
          <button onClick={onClose} style={galleryClose}>✕</button>
        </div>

        {previewSrc && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img src={previewSrc} alt="preview" style={{ maxWidth: "100%", maxHeight: 700, borderRadius: 15, boxShadow: "0 6px 18px rgba(0,0,0,.2)" }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8 }}>
          <button onClick={() => inputRef.current?.click()} style={btnBlue} disabled={remaining === 0}>
            ⬆️ Upload images ({remaining} left)
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
          <div style={{ fontSize: 13, color: "#334155" }}>Max {MAX_IMAGES_PER_PRODUCT} images per product.</div>
          {busy && (
            <div style={{ fontSize: 13, fontWeight: 800, color: busy.startsWith("❌") ? "#b91c1c" : "#0f766e" }}>
              {busy}
            </div>
          )}
        </div>

        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile}>
                <img src={thumbUrl(src, 320)} alt={`img-${i}`} style={thumbImg} onClick={() => setPreviewSrc(src)} />
                <button onClick={() => onRemoveImage(i)} style={thumbRemove}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= ✂️ Split-quantity modal =========
   A returned product often needs two different fates: part of a 6 KG line is
   condemned and the rest still goes to production. Rather than deleting the row
   and retyping two, this splits the line in place and keeps the total intact. */
function SplitQtyModal({ open, row, draft, onChange, onCancel, onConfirm, busy }) {
  if (!open || !row) return null;

  const total = round3(row.quantity || 0);
  const unit = qtyUnit(row);
  const part = Number(draft.qty);
  const partOk = Number.isFinite(part) && part > 0 && part < total;
  const actionOk = draft.action !== "إجراء آخر..." || !!(draft.customAction || "").trim();
  const valid = partOk && actionOk;
  const remaining = partOk ? round3(total - part) : null;
  const newActionTxt =
    draft.action === "إجراء آخر..." ? (draft.customAction || "").trim() || "—" : draft.action;

  return (
    <div style={galleryBack} onClick={onCancel}>
      <div style={splitCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            ✂️ Split quantity {row.productName ? `— ${row.productName}` : ""}
          </div>
          <button onClick={onCancel} style={galleryClose}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.6 }}>
          Give part of this line a different action — the rest keeps the current one.
          The line becomes two lines, so the report's total quantity never changes.
        </div>

        <div style={splitFactsRow}>
          <div style={splitFact}><span style={splitFactLbl}>Total quantity</span><b>{total} {unit}</b></div>
          <div style={splitFact}><span style={splitFactLbl}>Current action</span><b>{actionText(row) || "—"}</b></div>
          <div style={splitFact}><span style={splitFactLbl}>Item code</span><b>{row.itemCode || "—"}</b></div>
          <div style={splitFact}><span style={splitFactLbl}>Branch</span><b>{safeButchery(row) || "—"}</b></div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={splitLbl}>Quantity to move {unit ? `(${unit})` : ""}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number" min="0" step="0.001" autoFocus
              value={draft.qty}
              onChange={(e) => onChange({ qty: e.target.value })}
              placeholder={`e.g. ${round3(total / 2)}`}
              style={{ ...cellInputStyle, maxWidth: 180, fontWeight: 800 }}
            />
            <button type="button" style={splitChipBtn} onClick={() => onChange({ qty: String(round3(total / 2)) })}>½ Half</button>
          </div>
          {draft.qty !== "" && !partOk && (
            <div style={splitWarn}>
              Enter a number greater than 0 and less than {total}. To change the whole line, use ✏️ Edit instead.
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={splitLbl}>New action for that part</label>
          <select value={draft.action} onChange={(e) => onChange({ action: e.target.value })} style={{ ...cellInputStyle, fontWeight: 700 }}>
            {ACTIONS.map((act) => (
              <option value={act} key={act}>{act === "إجراء آخر..." ? "Other action..." : act}</option>
            ))}
          </select>
          {draft.action === "إجراء آخر..." && (
            <input
              value={draft.customAction}
              onChange={(e) => onChange({ customAction: e.target.value })}
              placeholder="Specify action…"
              style={{ ...cellInputStyle, marginTop: 8 }}
            />
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={splitLbl}>Remarks for that part (optional)</label>
          <input
            value={draft.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            placeholder={row.remarks ? `Leave empty to keep: ${row.remarks}` : "Why is this part treated differently?"}
            style={cellInputStyle}
          />
        </div>

        {partOk && (
          <div style={splitPreview}>
            <div style={splitPreviewRow}>
              <span style={splitKeep}>✅ Stays</span>
              <b>{remaining} {unit}</b>
              <span style={{ color: "#64748b" }}>→</span>
              <span>{actionText(row) || "—"}</span>
            </div>
            <div style={splitPreviewRow}>
              <span style={splitMove}>✂️ Moves</span>
              <b>{round3(part)} {unit}</b>
              <span style={{ color: "#64748b" }}>→</span>
              <span style={{ fontWeight: 800, color: "#b45309" }}>{newActionTxt}</span>
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
          Photos stay on the original line — the new line starts with none, so deleting
          one of the two can never remove images the other still shows.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onCancel} style={bulkCancelBtn} disabled={busy}>✖ Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!valid || busy}
            style={{ ...bulkSaveBtn, background: valid ? "#f59e0b" : "#cbd5e1", cursor: valid && !busy ? "pointer" : "not-allowed", boxShadow: "none" }}
          >
            {busy ? "⏳ Splitting…" : "✂️ Split line"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= Change the day a report is filed under ========= */
function ChangeDateModal({ open, fromDate, value, onChange, onCancel, onConfirm, busy, target, rowCount }) {
  if (!open) return null;

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && value !== fromDate;
  const merging = valid && !!target;
  const future = valid && value > businessToday();

  return (
    <div style={galleryBack} onClick={busy ? undefined : onCancel}>
      <div style={splitCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            📅 Change report date
          </div>
          <button onClick={onCancel} style={galleryClose} disabled={busy}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.6 }}>
          The whole day moves: every row, its photos and its change history are filed
          under the new date, and the old day disappears from the tree.
        </div>

        <div style={splitFactsRow}>
          <div style={splitFact}><span style={splitFactLbl}>Current date</span><b>{fromDate}</b></div>
          <div style={splitFact}><span style={splitFactLbl}>Rows</span><b>{rowCount}</b></div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={splitLbl}>New date</label>
          <input
            type="date"
            value={value}
            max="2100-12-31"
            onChange={(e) => onChange(e.target.value)}
            style={{ ...cellInputStyle, maxWidth: 220, fontWeight: 800 }}
          />
          {value && value === fromDate && (
            <div style={splitWarn}>That is the date the report already has.</div>
          )}
          {future && (
            <div style={{ ...splitWarn, color: "#b45309" }}>
              ⚠️ That date is in the future — check it before saving.
            </div>
          )}
        </div>

        {merging && (
          <div style={splitPreview}>
            <div style={splitPreviewRow}>
              <span style={splitMove}>Merge</span>
              <span>
                {value} already has a report with <b>{(target.items || []).length}</b> row(s).
                The two days are joined into one — <b>{(target.items || []).length + rowCount}</b> rows
                under {value} — and nothing is lost.
              </span>
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
          Photos are never deleted by this move; the rows keep the images they already show.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onCancel} style={bulkCancelBtn} disabled={busy}>✖ Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!valid || busy}
            style={{ ...bulkSaveBtn, background: valid ? (merging ? "#f59e0b" : "#0ea5e9") : "#cbd5e1", cursor: valid && !busy ? "pointer" : "not-allowed", boxShadow: "none" }}
          >
            {busy ? "⏳ Moving…" : merging ? `🔀 Merge into ${value}` : "📅 Move report"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== Main Component ====================== */
export default function ReturnView() {
  const [reports, setReports] = useState([]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [treeHidden, setTreeHidden] = useState(() => {
    try { return localStorage.getItem(TREE_HIDDEN_KEY) === "1"; } catch { return false; }
  });
  const [serverErr, setServerErr] = useState("");
  const [loadingServer, setLoadingServer] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const [editRowIdx, setEditRowIdx] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [addingRow, setAddingRow] = useState(false);

  // ✅ Bulk edit mode — edit all rows at once, save once
  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  // ✅ Table row search filter
  const [rowSearch, setRowSearch] = useState("");

  // ✅ Search by number (item code / transfer no) across every loaded date
  const [numSearch, setNumSearch] = useState("");

  // ✂️ Split part of a line's quantity onto a different action
  const [splitState, setSplitState] = useState({
    open: false, idx: -1, qty: "", action: "Condemnation", customAction: "", remarks: "",
  });
  const [splitBusy, setSplitBusy] = useState(false);

  // 📅 Move the whole day to another date (it was written under the wrong one)
  const [dateMove, setDateMove] = useState({ open: false, value: "", busy: false });

  // ✅ Confirm modal state
  const [confirmState, setConfirmState] = useState({ show: false, title: "", message: "", confirmLabel: "Confirm", confirmColor: "#dc2626", onConfirm: null });

  const showConfirm = useCallback(({ title, message, confirmLabel, confirmColor, onConfirm }) => {
    setConfirmState({ show: true, title, message, confirmLabel: confirmLabel || "Confirm", confirmColor: confirmColor || "#dc2626", onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((s) => ({ ...s, show: false, onConfirm: null }));
  }, []);

  /* ========== Load from server ========== */
  const reloadFromServer = useCallback(async () => {
    setServerErr("");
    setLoadingServer(true);
    try {
      const raw = await fetchReturns();
      const normalized = normalizeServerReturns(raw).sort((a, b) =>
        (b.reportDate || "").localeCompare(a.reportDate || "")
      );
      setReports(normalized);
      if (!selectedDate && normalized.length) setSelectedDate(normalized[0].reportDate);
    } catch (e) {
      setServerErr("Failed to fetch from server. (Server may be waking up).");
      console.error(e);
    } finally {
      setLoadingServer(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    reloadFromServer();
    // eslint-disable-next-line
  }, []);

  /* ===== Item catalog (items.json) — the item code owns the product name =====
     Same source the main /returns input page uses, so typing a code on the
     view/edit rows fills the product name (and origin) exactly as it does there. */
  const [fileItems, setFileItems] = useState([]);   // static /data/items.json
  const [serverItems, setServerItems] = useState([]); // codes added through the app catalog
  useEffect(() => {
    let alive = true;
    // 1) the static file
    (async () => {
      const tryUrls = ["/data/items.json", `${API_BASE}/data/items.json`];
      for (const url of tryUrls) {
        try {
          const r = await fetch(url, { cache: "no-cache" });
          if (!r.ok) continue;
          const json = await r.json();
          const list = Array.isArray(json) ? json : (json?.items || json?.data || []);
          if (alive && Array.isArray(list) && list.length) { setFileItems(list); return; }
        } catch { /* try next */ }
      }
    })();
    // 2) the server catalog — this is where codes added via "Add item" live, so
    //    without it the newly-added codes never show up on the view page.
    (async () => {
      try {
        const s = await fetchServerItems();
        if (alive && Array.isArray(s)) setServerItems(s);
      } catch { /* file catalog is enough */ }
    })();
    return () => { alive = false; };
  }, []);

  const normCode = useCallback(
    (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/[-_()\/\\]/g, ""),
    []
  );

  /* One merged catalog: static file first, server items win on a code clash
     (a code the user just edited should read back its new name). */
  const catalogItems = useMemo(() => {
    const map = new Map();
    const push = (it) => {
      const code = String(it?.item_code ?? it?.itemCode ?? "").trim();
      const name = String(it?.description ?? it?.productName ?? it?.name ?? "").trim();
      if (!code || !name) return;
      const key = normCode(code);
      if (!key) return;
      map.set(key, { item_code: code, description: name, origin: String(it?.origin ?? "").trim() });
    };
    fileItems.forEach(push);
    serverItems.forEach(push); // overwrite → server value wins
    return Array.from(map.values());
  }, [fileItems, serverItems, normCode]);

  const catalogByCode = useMemo(() => {
    const m = new Map();
    for (const it of catalogItems) {
      const key = normCode(it.item_code);
      if (key) m.set(key, it);
    }
    return m;
  }, [catalogItems, normCode]);

  /* Suggestion search: by code or name, code-prefix matches first. */
  const catalogSearch = useCallback((q) => {
    const s = normCode(q);
    const nameQ = String(q ?? "").trim().toLowerCase();
    if (!s && !nameQ) return catalogItems.slice(0, 20);
    const scored = [];
    for (const it of catalogItems) {
      const code = normCode(it.item_code);
      const name = String(it.description || "").toLowerCase();
      let rank = -1;
      if (s && code.startsWith(s)) rank = 0;
      else if (s && code.includes(s)) rank = 1;
      else if (nameQ && name.includes(nameQ)) rank = 2;
      if (rank >= 0) scored.push({ it, rank });
    }
    scored.sort((a, b) => a.rank - b.rank);
    return scored.slice(0, 20).map((x) => x.it);
  }, [catalogItems, normCode]);

  /* Everything the item code owns. productName/origin mirror the code strictly
     (a stale value must not survive a code change); an unmatched code clears them. */
  const codePatch = useCallback((code) => {
    const key = normCode(code);
    const hit = key ? catalogByCode.get(key) : null;
    if (!hit) return {}; // unknown code: leave any hand-typed name/origin untouched
    const patch = { productName: hit.description || hit.item_name || hit.name || "" };
    if (hit.origin) patch.origin = hit.origin;
    return patch;
  }, [catalogByCode, normCode]);

  /* Build the field update for an item-code edit: set the code and, when it
     matches the catalog, fill the product name (and origin) from it. */
  const codeFieldPatch = useCallback(
    (code) => ({ itemCode: code, ...codePatch(code) }),
    [codePatch]
  );

  // ✅ Auto-expand current year + month on first load
  useEffect(() => {
    if (!reports.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const y = today.slice(0, 4);
    const m = today.slice(5, 7);
    setOpenYears((prev) => ({ ...prev, [y]: true }));
    setOpenMonths((prev) => ({ ...prev, [`${y}-${m}`]: true }));
  }, [reports.length > 0]); // eslint-disable-line

  const parts = (dateStr) => {
    if (!dateStr || dateStr.length < 10) return { y: "", m: "", d: "" };
    return { y: dateStr.slice(0, 4), m: dateStr.slice(5, 7), d: dateStr.slice(8, 10) };
  };
  const monthKey = (dateStr) => { const p = parts(dateStr); return p.y && p.m ? p.y + "-" + p.m : ""; };
  const yearKey = (dateStr) => parts(dateStr).y || "";

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
  }, [reports, filterFrom, filterTo]);

  useEffect(() => {
    if (!filteredReports.length) { setSelectedDate(""); return; }
    const stillExists = filteredReports.some((r) => r.reportDate === selectedDate);
    if (!stillExists) setSelectedDate(filteredReports[0].reportDate);
  }, [filteredReports, selectedDate]);

  const selectedReportIndex = useMemo(
    () => filteredReports.findIndex((r) => r.reportDate === selectedDate),
    [filteredReports, selectedDate]
  );
  const selectedReport = selectedReportIndex >= 0 ? filteredReports[selectedReportIndex] : null;

  // KPIs
  const kpi = useMemo(() => {
    let totalItems = 0, totalQty = 0;
    const byAction = {};
    filteredReports.forEach((rep) => {
      totalItems += (rep.items || []).length;
      (rep.items || []).forEach((it) => {
        totalQty += Number(it.quantity || 0);
        const action = it.action === "إجراء آخر..." ? it.customAction : it.action;
        if (action) byAction[action] = (byAction[action] || 0) + 1;
      });
    });
    return { totalReports: filteredReports.length, totalItems, totalQty, byAction };
  }, [filteredReports]);

  const today = new Date().toISOString().slice(0, 10);
  const newReportsCount = filteredReports.filter((r) => r.reportDate === today).length;
  const showAlert = kpi.totalQty > 50 || filteredReports.length > 50;
  const alertMsg = kpi.totalQty > 50
    ? "⚠️ The total quantity of returns is very high!"
    : filteredReports.length > 50
    ? "⚠️ A large number of return reports in this period!"
    : "";

  // ✅ Summary for selected report
  const selectedSummary = useMemo(() => {
    if (!selectedReport) return null;
    let kg = 0, pcs = 0, plate = 0, other = 0;
    (selectedReport.items || []).forEach((it) => {
      const qty = Number(it.quantity || 0);
      const type =
        it.qtyType === "أخرى" || it.qtyType === "أخرى / Other"
          ? it.customQtyType || "Other"
          : it.qtyType;
      if (type === "KG") kg += qty;
      else if (type === "PCS") pcs += qty;
      else if (type === "PLATE") plate += qty;
      else other += qty;
    });
    return { count: (selectedReport.items || []).length, kg, pcs, plate, other };
  }, [selectedReport]);

  // Hierarchy
  const hierarchy = useMemo(() => {
    const years = new Map();
    filteredReports.forEach((rep) => {
      const y = yearKey(rep.reportDate);
      const m = monthKey(rep.reportDate).slice(5, 7);
      if (!y || !m) return;
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(rep.reportDate);
    });
    years.forEach((months) => months.forEach((days, m) => { days.sort((a, b) => b.localeCompare(a)); months.set(m, days); }));
    const sortedYears = Array.from(years.keys()).sort((a, b) => b.localeCompare(a));
    return sortedYears.map((y) => {
      const months = years.get(y);
      const sortedMonths = Array.from(months.keys()).sort((a, b) => b.localeCompare(a));
      return { year: y, months: sortedMonths.map((m) => ({ month: m, days: months.get(m) })) };
    });
  }, [filteredReports]);

  /* ========== Date tree folding ========== */
  useEffect(() => {
    try { localStorage.setItem(TREE_HIDDEN_KEY, treeHidden ? "1" : "0"); } catch {}
  }, [treeHidden]);

  const allTreeOpen = useMemo(() => {
    if (!hierarchy.length) return false;
    return hierarchy.every(({ year, months }) =>
      openYears[year] && months.every(({ month }) => openMonths[year + "-" + month]));
  }, [hierarchy, openYears, openMonths]);

  const collapseTreeNodes = () => { setOpenYears({}); setOpenMonths({}); };

  const expandTreeNodes = () => {
    const ys = {}, ms = {};
    hierarchy.forEach(({ year, months }) => {
      ys[year] = true;
      months.forEach(({ month }) => { ms[year + "-" + month] = true; });
    });
    setOpenYears(ys);
    setOpenMonths(ms);
  };

  /* ========== Row add/edit/delete logic ========== */
  const blankRow = {
    itemCode: "", productName: "", origin: "", butchery: "", customButchery: "", transferNo: "",
    quantity: "", qtyType: "", customQtyType: "", expiry: "", remarks: "",
    action: ACTIONS[0], customAction: "", images: [],
  };

  const startAddRow = () => {
    if (!selectedReport) return;
    setAddingRow(true);
    setEditRowIdx((selectedReport.items || []).length);
    setEditRowData({ ...blankRow });
  };

  const startEditRow = (i) => {
    if (!selectedReport) return;
    const row = selectedReport.items[i];
    setAddingRow(false);
    setEditRowIdx(i);
    setEditRowData({
      itemCode: row.itemCode || "",
      productName: row.productName || "",
      origin: row.origin || "",
      butchery: isOtherBranch(row.butchery) ? row.butchery : normalizeBranch(row.butchery),
      customButchery: row.customButchery || "",
      transferNo: row.transferNo || "",
      quantity: row.quantity ?? "",
      qtyType: row.qtyType || "",
      customQtyType: row.customQtyType || "",
      expiry: row.expiry || "",
      remarks: row.remarks || "",
      action: row.action || "",
      customAction: row.customAction || "",
      images: Array.isArray(row.images) ? row.images : [],
    });
  };

  const cancelEditRow = () => { setAddingRow(false); setEditRowIdx(null); setEditRowData(null); };

  const prepareRowForSave = (row, existingImages = []) => {
    const qtyNum = Number(row.quantity);
    const chosen = (row.butchery || "").trim();
    const isOther = isOtherBranch(chosen);
    // Only keep customButchery when the chosen branch is actually "Other branch".
    // Otherwise a stale custom value would force the save back to "Other branch".
    const customB = isOther ? (row.customButchery || "").trim() : "";
    const butcheryLabel = isOther ? "فرع آخر... / Other branch" : chosen;
    return {
      itemCode: (row.itemCode || "").trim(),
      productName: (row.productName || "").trim(),
      origin: (row.origin || "").trim(),
      butchery: butcheryLabel,
      customButchery: customB,
      transferNo: (row.transferNo || "").trim(),
      quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0,
      qtyType: (row.customQtyType || "").trim() ? "أخرى" : (row.qtyType || "").trim(),
      customQtyType: (row.customQtyType || "").trim(),
      expiry: (row.expiry || "").trim(),
      remarks: (row.remarks || "").trim(),
      action: row.action || "",
      customAction: row.action === "إجراء آخر..." ? (row.customAction || "").trim() : "",
      images: Array.isArray(row.images) ? row.images : existingImages,
      // The day this line became a destruction — see `stampActionDate`. It has
      // to be carried here or the next edit of the row would drop it.
      ...(row.actionDate ? { actionDate: String(row.actionDate).slice(0, 10) } : {}),
      // Split lineage has to survive later edits: anything not listed in this
      // shape is dropped the next time the row is saved.
      ...(row.splitGroup ? { splitGroup: row.splitGroup } : {}),
      ...(row.splitOf ? { splitOf: Number(row.splitOf) || 0 } : {}),
    };
  };

  const saveRow = async () => {
    if (!selectedReport || editRowIdx === null || !editRowData) return;
    if (!editRowData.productName?.trim()) {
      setOpMsg("❌ Enter product name."); setTimeout(() => setOpMsg(""), 3000); return;
    }
    const qtyNum = Number(editRowData.quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setOpMsg("❌ Enter a valid quantity (> 0)."); setTimeout(() => setOpMsg(""), 3000); return;
    }
    if (isOtherBranch(editRowData.butchery) && !editRowData.customButchery?.trim()) {
      setOpMsg("❌ When choosing 'Other branch', please enter the branch name."); setTimeout(() => setOpMsg(""), 3500); return;
    }

    const currentItems = selectedReport.items || [];
    const existingImages = !addingRow && currentItems[editRowIdx] ? (currentItems[editRowIdx].images || []) : [];
    const prepared = prepareRowForSave(editRowData, existingImages);

    try {
      setOpMsg("⏳ Saving to server…");
      let changedAction = false, prevTxt = "";
      if (!addingRow && currentItems[editRowIdx]) {
        prevTxt = actionText(currentItems[editRowIdx]);
        const nextTxt = actionText(prepared);
        changedAction = prevTxt && prevTxt !== nextTxt;
      }
      stampActionDate(prepared, changedAction);

      const newItems = addingRow
        ? [...currentItems, prepared]
        : currentItems.map((r, i) => (i === editRowIdx ? prepared : r));

      await saveReportToServer(selectedReport.reportDate, newItems, sigOf(selectedReport));

      if (changedAction) {
        await appendActionChange(selectedReport.reportDate, {
          key: itemKey(prepared),
          from: prevTxt,
          to: actionText(prepared),
          at: new Date().toISOString(),
        });
      }
      await reloadFromServer();
      cancelEditRow();
      setOpMsg("✅ Saved.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to save.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ========== Bulk edit (edit all rows, save once) ========== */
  const startBulkEdit = () => {
    if (!selectedReport) return;
    // close any single-row edit / add first
    setAddingRow(false); setEditRowIdx(null); setEditRowData(null);
    setRowSearch("");
    setBulkRows((selectedReport.items || []).map((r) => ({
      ...r,
      butchery: isOtherBranch(r.butchery) ? r.butchery : normalizeBranch(r.butchery),
      quantity: r.quantity ?? "",
    })));
    setBulkEdit(true);
  };

  const cancelBulkEdit = () => { setBulkEdit(false); setBulkRows([]); };

  const updateBulkRow = (idx, patch) =>
    setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  // Mark/unmark a row for removal (kept in place so indices stay aligned)
  const toggleBulkRemove = (idx) =>
    setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, _removed: !r._removed } : r)));

  const saveBulkEdit = async () => {
    if (!selectedReport) return;
    const kept = bulkRows.filter((r) => !r._removed);
    if (kept.length === 0) {
      setOpMsg("❌ At least one row is required."); setTimeout(() => setOpMsg(""), 3000); return;
    }
    // validate each kept row
    for (let n = 0; n < kept.length; n++) {
      const r = kept[n];
      if (!r.productName?.trim()) {
        setOpMsg(`❌ Row ${n + 1}: enter product name.`); setTimeout(() => setOpMsg(""), 3500); return;
      }
      const q = Number(r.quantity);
      if (!Number.isFinite(q) || q <= 0) {
        setOpMsg(`❌ Row ${n + 1}: enter a valid quantity (> 0).`); setTimeout(() => setOpMsg(""), 3500); return;
      }
      if (isOtherBranch(r.butchery) && !r.customButchery?.trim()) {
        setOpMsg(`❌ Row ${n + 1}: enter the 'Other branch' name.`); setTimeout(() => setOpMsg(""), 3500); return;
      }
    }
    try {
      setBulkSaving(true);
      setOpMsg("⏳ Saving all rows…");
      const items = (selectedReport.items || []);
      const prepared = bulkRows
        .map((r, idx) => ({ r, img: items[idx]?.images || [], was: items[idx] }))
        .filter((x) => !x.r._removed)
        .map((x) => stampActionDate(
          prepareRowForSave(x.r, x.img),
          !!x.was && actionText(x.was) !== actionText(x.r)
        ));
      await saveReportToServer(selectedReport.reportDate, prepared, sigOf(selectedReport));
      await reloadFromServer();
      cancelBulkEdit();
      setOpMsg("✅ All rows saved.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to save all.");
    } finally {
      setBulkSaving(false);
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  // ✅ deleteRow uses ConfirmModal instead of window.confirm
  const deleteRow = async (i) => {
    if (!selectedReport) return;
    showConfirm({
      title: `Delete row ${i + 1}?`,
      message: "This will permanently remove this item and its images from the report.",
      confirmLabel: "🗑️ Delete",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        closeConfirm();
        try {
          setOpMsg("⏳ Deleting row images…");
          const row = (selectedReport.items || [])[i] || {};
          await deleteImagesMany(Array.isArray(row.images) ? row.images : []);
          setOpMsg("⏳ Deleting row…");
          const newItems = (selectedReport.items || []).filter((_, idx) => idx !== i);
          await saveReportToServer(selectedReport.reportDate, newItems, sigOf(selectedReport));
          await reloadFromServer();
          if (editRowIdx === i) cancelEditRow();
          setOpMsg("✅ Row deleted.");
        } catch (e) {
          console.error(e);
          setOpMsg("❌ Failed to delete row.");
        } finally {
          setTimeout(() => setOpMsg(""), 3000);
        }
      },
    });
  };

  /* ========== ✂️ Split part of a quantity onto another action ========== */
  const openSplit = (i) => {
    const row = (selectedReport?.items || [])[i];
    if (!row) return;
    const total = Number(row.quantity || 0);
    if (!Number.isFinite(total) || total <= 0) {
      setOpMsg("❌ This line has no quantity to split.");
      setTimeout(() => setOpMsg(""), 3000);
      return;
    }
    setAddingRow(false); setEditRowIdx(null); setEditRowData(null);
    setSplitState({
      open: true, idx: i, qty: "",
      action: ACTIONS.includes("Condemnation") ? "Condemnation" : ACTIONS[0],
      customAction: "", remarks: "",
    });
  };

  const closeSplit = () => setSplitState((s) => ({ ...s, open: false, idx: -1 }));

  const confirmSplit = async () => {
    if (!selectedReport || splitState.idx < 0) return;
    const items = selectedReport.items || [];
    const idx = splitState.idx;
    const row = items[idx];
    if (!row) return;

    const total = round3(row.quantity || 0);
    const part = round3(splitState.qty);
    if (!(part > 0) || part >= total) {
      setOpMsg("❌ The split quantity must be greater than 0 and less than the line total.");
      setTimeout(() => setOpMsg(""), 3500);
      return;
    }
    if (splitState.action === "إجراء آخر..." && !splitState.customAction.trim()) {
      setOpMsg("❌ Specify the other action.");
      setTimeout(() => setOpMsg(""), 3000);
      return;
    }

    // Both halves carry the same group id and the quantity they came from, so a
    // reader can still tell that "3 + 3" used to be one 6 KG line.
    const group = row.splitGroup || `sp-${Date.now().toString(36)}`;
    const cameFrom = Number(row.splitOf) > 0 ? Number(row.splitOf) : total;
    const stays = { ...row, quantity: round3(total - part), splitGroup: group, splitOf: cameFrom };
    /* The half that moves is the one being condemned, so it is the half that
       carries the day the decision was made. */
    const moves = stampActionDate({
      ...row,
      quantity: part,
      action: splitState.action,
      customAction: splitState.action === "إجراء آخر..." ? splitState.customAction.trim() : "",
      remarks: splitState.remarks.trim() || row.remarks || "",
      images: [],           // photos stay on the original line (shared Cloudinary URLs)
      splitGroup: group,
      splitOf: cameFrom,
    }, true);
    const newItems = [...items.slice(0, idx), stays, moves, ...items.slice(idx + 1)];

    try {
      setSplitBusy(true);
      setOpMsg("⏳ Splitting the line…");
      await saveReportToServer(selectedReport.reportDate, newItems, sigOf(selectedReport));
      await appendActionChange(selectedReport.reportDate, {
        key: itemKey(row),
        from: actionText(row),
        to: actionText(moves),
        partial: true,
        qty: part,
        of: total,
        unit: qtyUnit(row),
        at: new Date().toISOString(),
      });
      await reloadFromServer();
      closeSplit();
      setOpMsg(`✅ ${part} ${qtyUnit(row)} moved to “${actionText(moves)}”.`);
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to split the line.");
    } finally {
      setSplitBusy(false);
      setTimeout(() => setOpMsg(""), 3500);
    }
  };

  /* ======= Images actions ======= */
  const openImagesFor = (i) => { setImageRowIndex(i); setImageModalOpen(true); };
  const closeImages = () => setImageModalOpen(false);

  /* The images modal can be opened on a row that is currently being edited.
     Two things go wrong if that is ignored:
       - a row being ADDED is not in selectedReport.items yet, so writing the
         merged list back by index matched nothing and the upload was dropped;
       - a row being EDITED keeps its own draft copy, so saving the row put the
         pre-upload image list back over the one we had just stored.
     So: a new row keeps its images on the draft until the row itself is saved,
     and an existing row updates the server AND the draft together. */
  const editingImageRow =
    editRowIdx !== null && imageRowIndex >= 0 && imageRowIndex === editRowIdx && !!editRowData;

  const addImagesToRow = async (urls) => {
    if (imageRowIndex < 0) return;

    // A row that is still being added does not exist on the server yet.
    if (editingImageRow && addingRow) {
      setEditRowData((s) => ({
        ...s,
        images: [...(Array.isArray(s?.images) ? s.images : []), ...urls].slice(0, MAX_IMAGES_PER_PRODUCT),
      }));
      setOpMsg("✅ Images attached — press Save to store the row.");
      setTimeout(() => setOpMsg(""), 3000);
      return;
    }

    if (!selectedReport) return;
    try {
      const items = selectedReport.items || [];
      const row = items[imageRowIndex] || {};
      const cur = Array.isArray(row.images) ? row.images : [];
      const merged = [...cur, ...urls].slice(0, MAX_IMAGES_PER_PRODUCT);
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: merged } : r));
      setOpMsg("⏳ Updating images…");
      await saveReportToServer(selectedReport.reportDate, newItems, sigOf(selectedReport));
      if (editingImageRow) setEditRowData((s) => ({ ...s, images: merged }));
      await reloadFromServer();
      setOpMsg("✅ Images updated.");
    } catch (e) {
      console.error(e); setOpMsg("❌ Failed to update images.");
    } finally { setTimeout(() => setOpMsg(""), 3000); }
  };

  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;

    if (editingImageRow && addingRow) {
      const cur = Array.isArray(editRowData?.images) ? [...editRowData.images] : [];
      const url = cur[imgIndex];
      if (url) { try { await deleteImage(url); } catch (err) { console.warn(err); } }
      cur.splice(imgIndex, 1);
      setEditRowData((s) => ({ ...s, images: cur }));
      return;
    }

    if (!selectedReport) return;
    try {
      const items = selectedReport.items || [];
      const row = items[imageRowIndex] || {};
      const cur = Array.isArray(row.images) ? [...row.images] : [];
      const url = cur[imgIndex];
      if (url) { setOpMsg("⏳ Removing image…"); try { await deleteImage(url); } catch (err) { console.warn(err); } }
      cur.splice(imgIndex, 1);
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: cur } : r));
      setOpMsg("⏳ Updating report…");
      await saveReportToServer(selectedReport.reportDate, newItems, sigOf(selectedReport));
      if (editingImageRow) setEditRowData((s) => ({ ...s, images: cur }));
      await reloadFromServer();
      setOpMsg("✅ Image removed.");
    } catch (e) {
      console.error(e); setOpMsg("❌ Failed to remove image.");
    } finally { setTimeout(() => setOpMsg(""), 3000); }
  };

  /* ========== Delete selected day report ========== */
  const handleDeleteDay = () => {
    if (!selectedReport) return;
    const d = selectedReport.reportDate;
    showConfirm({
      title: `Delete report for ${d}?`,
      message: "This will permanently delete the entire day's report and all its images from the server. This cannot be undone.",
      confirmLabel: "🗑️ Delete Report",
      confirmColor: "#b91c1c",
      onConfirm: async () => {
        closeConfirm();
        try {
          const urls = collectImagesFromItems(selectedReport.items || []);
          setOpMsg("⏳ Deleting report images…");
          await deleteImagesMany(urls);
          setOpMsg("⏳ Deleting report from server…");
          const res = await fetch(
            `${API_BASE}/api/reports?type=returns&reportDate=${encodeURIComponent(d)}`,
            { method: "DELETE" }
          );
          const json = await res.json().catch(() => null);
          if (!res.ok) throw new Error(json?.error || res.statusText);
          if (json?.deleted === 0) {
            setOpMsg("ℹ️ Nothing to delete (it may already be deleted).");
          } else {
            forgetFiledDate("returns", d); // the input screen may still call the day filed
            await reloadFromServer();
            setSelectedDate("");
            setOpMsg("✅ Deleted this day's report from server.");
          }
        } catch (e) {
          console.error(e); setOpMsg("❌ Failed to delete report.");
        } finally { setTimeout(() => setOpMsg(""), 3000); }
      },
    });
  };

  /* ========== Move the selected day to another date ==========
     A returns report is filed under its business date - that date IS its key
     on the server, so "changing the date" means writing the day again under
     the new one and dropping the old record; there is no field to rename. */
  const openDateMove = () => {
    if (!selectedReport) return;
    setDateMove({ open: true, value: selectedReport.reportDate, busy: false });
  };
  const closeDateMove = () => setDateMove((s) => (s.busy ? s : { ...s, open: false }));

  const confirmDateMove = async () => {
    if (!selectedReport) return;
    const from = selectedReport.reportDate;
    const to = (dateMove.value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to) || to === from) return;

    // Looked up across every report, not the filtered ones: a day hidden by the
    // date filter would still be overwritten by the save below.
    const target = reports.find((r) => r.reportDate === to) || null;
    const movedRows = selectedReport.items || [];
    // On a merge the target day's own rows stay first, where its reader expects them.
    const items = target ? [...(target.items || []), ...movedRows] : movedRows;
    const meta = {
      checkedBy: target?.checkedBy || selectedReport.checkedBy || "",
      verifiedBy: target?.verifiedBy || selectedReport.verifiedBy || "",
    };

    setDateMove((s) => ({ ...s, busy: true }));
    try {
      setOpMsg("⏳ Writing the report under the new date…");
      await saveReportToServer(to, items, meta);

      /* The old record goes, its images stay: the very same Cloudinary URLs are
         now carried by the rows under the new date, so deleting them here would
         blank the report that was just saved. */
      setOpMsg("⏳ Removing the old date…");
      const res = await fetch(
        `${API_BASE}/api/reports?type=returns&reportDate=${encodeURIComponent(from)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`half-moved: ${res.status} ${await res.text().catch(() => "")}`);

      await moveChangeLog(from, to);
      await appendActionChange(to, {
        key: "",
        dateMove: true,
        fromDate: from,
        toDate: to,
        rows: movedRows.length,
        merged: !!target,
        at: new Date().toISOString(),
      });

      /* The input screen answers "is this day already filed?" from a cached
         index; without this it would keep warning about the day that moved
         away and stay silent about the one it landed on. */
      moveFiledDate("returns", from, to);

      await reloadFromServer();
      // A day moved outside the active filter would vanish from the tree the
      // moment it arrives, so the filter opens up to let it show.
      if (filterFrom && to < filterFrom) setFilterFrom("");
      if (filterTo && to > filterTo) setFilterTo("");
      setSelectedDate(to);
      setDateMove({ open: false, value: "", busy: false });
      setOpMsg(target ? `✅ ${movedRows.length} row(s) merged into ${to}.` : `✅ Report moved to ${to}.`);
    } catch (e) {
      console.error(e);
      setDateMove((s) => ({ ...s, busy: false }));
      /* When the delete is what failed, the new day is already written: the same
         rows now sit under both dates, and saying "failed" would hide that. */
      setOpMsg(
        String(e?.message || "").startsWith("half-moved")
          ? `⚠️ Saved under ${to}, but ${from} could not be removed — delete that day by hand.`
          : "❌ Failed to change the report date."
      );
      await reloadFromServer();
    } finally {
      setTimeout(() => setOpMsg(""), 6000);
    }
  };

  /* ========== Export/Import ========== */
  async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }

  /* The PDF prints what the table shows. Three things had to change: the old
     portrait layout was 640pt wide inside 515pt of usable page (the last two
     columns fell off the paper), ITEM CODE was missing entirely, and a split
     line printed as two unrelated rows. */
  const PDF_COLS = [
    { key: "sl",       label: "SL",         w: 24, align: "center" },
    { key: "itemCode", label: "ITEM CODE",  w: 68 },
    { key: "product",  label: "PRODUCT",    w: 150 },
    { key: "origin",   label: "ORIGIN",     w: 66 },
    { key: "butchery", label: "BUTCHERY",   w: 72 },
    { key: "trn",      label: "TRN NO",     w: 58 },
    { key: "qty",      label: "QTY",        w: 60, align: "right" },
    { key: "qtyType",  label: "QTY TYPE",   w: 50 },
    { key: "expiry",   label: "EXPIRY",     w: 60 },
    { key: "remarks",  label: "REMARKS",    w: 78 },
    { key: "action",   label: "ACTION",     w: 92 },
  ];

  /* jsPDF's built-in fonts are WinAnsi — Arabic would come out as mojibake and
     also breaks line wrapping, so it is dropped and flagged rather than faked. */
  const pdfSafe = (v) => {
    const raw = String(v ?? "").trim();
    if (!raw) return "";
    const kept = raw
      // Curly quotes, dashes and ellipsis are typed by people and would other-
      // wise be stripped as "not Latin-1"; fold them to their ASCII twin first.
      .replace(/[‘’‛]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...")
      .replace(/[^\x20-\xFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return kept || "[AR]";
  };

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      setOpMsg("⏳ Creating PDF…");
      const JsPDF = await ensureJsPDF();
      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

      const pageW = doc.internal.pageSize.getWidth();   // 842
      const pageH = doc.internal.pageSize.getHeight();  // 595
      const marginX = 32;
      const tableW = PDF_COLS.reduce((a, c) => a + c.w, 0); // 778
      const tableX = marginX;
      const bottomLimit = pageH - 42;

      const rows = filteredRows;
      const anySplit = rows.some((r) => Number(r.splitOf) > 0);

      const drawTableHead = (top) => {
        doc.setFillColor(219, 234, 254);
        doc.setDrawColor(148, 178, 214);
        doc.rect(tableX, top, tableW, 20, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(12, 74, 110);
        let x = tableX;
        PDF_COLS.forEach((c) => {
          const tx = c.align === "right" ? x + c.w - 4 : c.align === "center" ? x + c.w / 2 : x + 4;
          doc.text(c.label, tx, top + 13, { align: c.align === "right" ? "right" : c.align === "center" ? "center" : "left" });
          x += c.w;
        });
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        return top + 20;
      };

      const drawPageHead = () => {
        let top = 42;
        doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(17, 24, 39);
        doc.text("Branch Returns Report", tableX, top);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
        doc.text(`Date: ${selectedReport.reportDate}`, tableX + tableW, top, { align: "right" });
        top += 16;

        const sum = selectedSummary || { count: rows.length, kg: 0, pcs: 0, plate: 0, other: 0 };
        const bits = [`Lines: ${rows.length}`];
        if (sum.kg > 0) bits.push(`Total KG: ${sum.kg.toFixed(2)}`);
        if (sum.pcs > 0) bits.push(`PCS: ${sum.pcs}`);
        if (sum.plate > 0) bits.push(`PLATE: ${sum.plate}`);
        doc.setFontSize(9);
        doc.text(bits.join("   |   "), tableX, top);
        top += 13;

        if (rowSearch.trim()) {
          doc.setTextColor(180, 83, 9);
          doc.text(`Filtered by "${pdfSafe(rowSearch)}" - ${rows.length} of ${(selectedReport.items || []).length} lines`, tableX, top);
          doc.setTextColor(71, 85, 105);
          top += 13;
        }
        doc.setTextColor(17, 24, 39);
        return drawTableHead(top + 4);
      };

      let y = drawPageHead();

      rows.forEach((row, i) => {
        const split = Number(row.splitOf) > 0 ? round3(row.splitOf) : 0;
        const qty = round3(row.quantity || 0);
        const cells = {
          sl: String(i + 1),
          itemCode: pdfSafe(row.itemCode),
          product: pdfSafe(row.productName),
          origin: pdfSafe(row.origin),
          butchery: pdfSafe(safeButchery(row)),
          trn: pdfSafe(row.transferNo),
          // A split line prints the part AND what it was cut from, so "3 (of 6)"
          // can never be mistaken for a whole 3 kg return.
          qty: split ? `${qty} (of ${split})` : String(row.quantity ?? ""),
          qtyType: pdfSafe(qtyUnit(row)),
          expiry: pdfSafe(row.expiry),
          remarks: pdfSafe(row.remarks),
          action: pdfSafe(actionText(row)),
        };

        const wrapped = PDF_COLS.map((c) => doc.splitTextToSize(cells[c.key] || "", c.w - 8));
        const lines = Math.max(1, ...wrapped.map((w) => w.length));
        const rowH = Math.max(18, lines * 9.5 + 8);

        if (y + rowH > bottomLimit) { doc.addPage(); y = drawPageHead(); }

        const condemned = /condemn|dispos/i.test(actionText(row) || "");
        if (split) {
          // Shading is the only marker that survives a black-and-white print run
          // as well as it does on screen.
          doc.setFillColor(...(condemned ? [254, 236, 236] : [255, 250, 235]));
          doc.rect(tableX, y, tableW, rowH, "F");
        }
        doc.setDrawColor(198, 214, 235);
        doc.rect(tableX, y, tableW, rowH, "S");

        let x = tableX;
        PDF_COLS.forEach((c, ci) => {
          const isSplitQty = split && c.key === "qty";
          if (isSplitQty) doc.setFont("helvetica", "bold");
          const tx = c.align === "right" ? x + c.w - 4 : c.align === "center" ? x + c.w / 2 : x + 4;
          doc.text(wrapped[ci], tx, y + 12, { align: c.align === "right" ? "right" : c.align === "center" ? "center" : "left" });
          if (isSplitQty) doc.setFont("helvetica", "normal");
          if (ci > 0) doc.line(x, y, x, y + rowH);
          x += c.w;
        });
        y += rowH;
      });

      if (anySplit) {
        y += 12;
        if (y > bottomLimit) { doc.addPage(); y = drawPageHead(); }
        doc.setFillColor(255, 250, 235);
        doc.rect(tableX, y - 9, 14, 10, "F");
        doc.setDrawColor(198, 214, 235);
        doc.rect(tableX, y - 9, 14, 10, "S");
        doc.setFontSize(8); doc.setTextColor(120, 53, 15);
        doc.text(
          'Shaded line = one returned quantity split between two actions. QTY shows the part and the original total, e.g. "3 (of 6)". A red tint marks the condemned part.',
          tableX + 20, y - 1
        );
        doc.setTextColor(17, 24, 39);
        y += 8;
      }

      // Page numbers + the Arabic-text caveat, once every page exists.
      const pages = doc.internal.getNumberOfPages();
      for (let pg = 1; pg <= pages; pg++) {
        doc.setPage(pg);
        doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
        doc.text(`Generated ${new Date().toLocaleString()}  |  Arabic text is not printable in this PDF and shows as [AR]`, tableX, pageH - 20);
        doc.text(`Page ${pg} of ${pages}`, pageW - marginX, pageH - 20, { align: "right" });
      }

      doc.save(`returns_${selectedReport.reportDate}.pdf`);
      setOpMsg("✅ PDF created.");
    } catch (e) { console.error(e); setOpMsg("❌ Failed to create PDF."); }
    finally { setTimeout(() => setOpMsg(""), 3000); }
  };

  /* ========== ✅ Filtered rows (search within table) ========== */
  const filteredRows = useMemo(() => {
    if (!selectedReport) return [];
    const s = rowSearch.trim().toLowerCase();
    if (!s) return (selectedReport.items || []).map((r, i) => ({ ...r, _origIdx: i }));
    return (selectedReport.items || [])
      .map((r, i) => ({ ...r, _origIdx: i }))
      .filter((r) => {
        return (
          (r.itemCode || "").toLowerCase().includes(s) ||
          (r.productName || "").toLowerCase().includes(s) ||
          (r.origin || "").toLowerCase().includes(s) ||
          (r.transferNo || "").toLowerCase().includes(s) ||
          safeButchery(r).toLowerCase().includes(s) ||
          (r.expiry || "").includes(s) ||
          (r.remarks || "").toLowerCase().includes(s) ||
          actionText(r).toLowerCase().includes(s)
        );
      });
  }, [selectedReport, rowSearch]);

  /* ========== ✅ Search by number across every date ========== */
  const numberMatches = useMemo(() => {
    const s = numSearch.trim().toLowerCase();
    if (!s) return [];
    const out = [];
    for (const report of filteredReports) {
      (report.items || []).forEach((r, i) => {
        if (
          (r.itemCode || "").toLowerCase().includes(s) ||
          (r.transferNo || "").toLowerCase().includes(s)
        ) {
          out.push({ ...r, _origIdx: i, _date: report.reportDate });
        }
      });
    }
    return out;
  }, [filteredReports, numSearch]);

  const numberMatchDays = useMemo(
    () => new Set(numberMatches.map((m) => m._date)).size,
    [numberMatches]
  );

  const jumpToMatch = (m) => {
    cancelBulkEdit();
    cancelEditRow();
    setSelectedDate(m._date);
    setRowSearch(numSearch.trim());
  };

  /* ======================== UI ======================== */
  const activeRow =
    imageRowIndex < 0
      ? null
      : editingImageRow
      ? editRowData
      : (selectedReport?.items?.[imageRowIndex] ?? null);
  const remainingForActive = Math.max(0, MAX_IMAGES_PER_PRODUCT - (activeRow?.images?.length || 0));

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", padding: "2rem", background: "linear-gradient(180deg, #f7f2fb 0%, #f4f6fa 100%)", minHeight: "100vh", direction: "ltr", color: "#111" }}>
      <h2 style={{ textAlign: "center", color: "#1f2937", fontWeight: "bold", marginBottom: "1.2rem" }}>
        📋 All Saved Returns Reports
        {newReportsCount > 0 && (
          <span style={{ marginLeft: 16, fontSize: "0.75em", color: "#b91c1c", background: "#fee2e2", borderRadius: "50%", padding: "4px 12px", fontWeight: "bold", verticalAlign: "top", boxShadow: "0 2px 6px #fee2e2" }}>
            🔴{newReportsCount}
          </span>
        )}
      </h2>

      {loadingServer && <div style={{ textAlign: "center", marginBottom: 10, color: "#1f2937" }}>⏳ Loading from server…</div>}
      {serverErr && <div style={{ textAlign: "center", marginBottom: 10, color: "#b91c1c" }}>{serverErr}</div>}
      {opMsg && (
        <div style={{ textAlign: "center", marginBottom: 10, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46", fontWeight: 700 }}>
          {opMsg}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: 18 }}>
        <KpiCard title="Total Reports" value={kpi.totalReports} emoji="📦" />
        <KpiCard title="Total Items" value={kpi.totalItems} emoji="🔢" />
        <KpiCard title="Total Quantity" value={kpi.totalQty.toFixed(2)} emoji="⚖️" />
        <KpiList title="Top Actions" entries={sortTop(kpi.byAction, 3)} />
      </div>

      {showAlert && (
        <div style={{ background: "#fff7ed", color: "#9a3412", border: "1.5px solid #f59e0b", fontWeight: "bold", borderRadius: 12, textAlign: "center", fontSize: "1.05em", marginBottom: 18, padding: "12px 10px" }}>
          {alertMsg}
        </div>
      )}

      {/* Controls + Export/Import */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "12px", marginBottom: 16, boxShadow: "0 2px 14px #e8daef66" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>Filter by report date:</span>
          <label>
            From:
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={dateInputStyle} />
          </label>
          <label>
            To:
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={dateInputStyle} />
          </label>
          {(filterFrom || filterTo) && (
            <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} style={clearBtn}>🧹 Clear</button>
          )}

          {/* ✅ Refresh button */}
          <button
            onClick={reloadFromServer}
            disabled={loadingServer}
            style={{ background: loadingServer ? "#94a3b8" : "#0369a1", color: "#fff", border: "none", borderRadius: 10, padding: "7px 18px", fontWeight: "bold", fontSize: "1em", cursor: loadingServer ? "not-allowed" : "pointer", boxShadow: "0 1px 6px #bae6fd" }}
          >
            {loadingServer ? "⏳ Loading…" : "🔄 Refresh"}
          </button>

        </div>

        {/* ✅ Search by number — item code or transfer no, across every date */}
        <div style={numBar}>
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>🔢 Search by number:</span>
          <input
            value={numSearch}
            onChange={(e) => setNumSearch(e.target.value)}
            placeholder="Item code or transfer no — searched in every date…"
            style={numInput}
          />
          {numSearch && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: numberMatches.length ? "#065f46" : "#b91c1c", whiteSpace: "nowrap" }}>
                {numberMatches.length} line(s) in {numberMatchDays} day(s)
              </span>
              <button onClick={() => setNumSearch("")} style={clearBtn}>✕ Clear</button>
            </>
          )}
        </div>

        {numSearch.trim() !== "" && (
          <div style={numResultsWrap}>
            {numberMatches.length === 0 ? (
              <div style={{ padding: "14px 10px", textAlign: "center", color: "#64748b" }}>
                No item code or transfer number matches “{numSearch.trim()}” in the selected period.
              </div>
            ) : (
              <table style={{ ...detailTable, minWidth: 820, fontSize: "0.9em" }}>
                <thead>
                  <tr>
                    <th style={thS}>DATE</th>
                    <th style={thS}>ITEM CODE</th>
                    <th style={thS}>TRANSFER NO</th>
                    <th style={thS}>PRODUCT</th>
                    <th style={thS}>BUTCHERY</th>
                    <th style={thS}>QTY</th>
                    <th style={thS}>ACTION</th>
                    <th style={thS}>GO</th>
                  </tr>
                </thead>
                <tbody>
                  {numberMatches.slice(0, 200).map((m, n) => (
                    <tr
                      key={`${m._date}-${m._origIdx}-${n}`}
                      className="rv-row"
                      style={{ background: m._date === selectedDate ? "#ecfeff" : n % 2 ? "#f8fbff" : "#fff", cursor: "pointer" }}
                      onClick={() => jumpToMatch(m)}
                    >
                      <td style={{ ...tdS, fontWeight: 800, color: "#0369a1" }}>{m._date}</td>
                      <td style={tdS}>{m.itemCode || "—"}</td>
                      <td style={tdS}>{m.transferNo || "—"}</td>
                      <td style={{ ...tdS, textAlign: "left" }}>{m.productName || "—"}</td>
                      <td style={tdS}>{safeButchery(m) || "—"}</td>
                      <td style={{ ...tdS, fontWeight: 800 }}>{m.quantity} {qtyUnit(m)}</td>
                      <td style={tdS}>{actionText(m) || "—"}</td>
                      <td style={tdS}><button onClick={(e) => { e.stopPropagation(); jumpToMatch(m); }} style={editBtn}>↗ Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {numberMatches.length > 200 && (
              <div style={{ padding: "8px 10px", fontSize: 12, color: "#64748b" }}>
                Showing the first 200 of {numberMatches.length} matches — narrow the number or the date range.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tree + Details */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
        {/* Left tree - folds away to a thin rail */}
        {treeHidden ? (
          <div style={treeRail} title="Show the date tree" onClick={() => setTreeHidden(false)}>
            <span style={{ fontWeight: 900, color: "#0369a1" }}>►</span>
            <span style={treeRailLabel}>📅 Date tree</span>
          </div>
        ) : (
        <div style={leftTree}>
          <div style={treeToolbar}>
            <span style={{ fontWeight: 800, color: "#334155", fontSize: 12 }}>📅 Date tree</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                style={treeToolBtn}
                disabled={hierarchy.length === 0}
                title={allTreeOpen ? "Collapse all years and months" : "Expand all years and months"}
                onClick={() => (allTreeOpen ? collapseTreeNodes() : expandTreeNodes())}
              >
                {allTreeOpen ? "⇱ Collapse all" : "⇲ Expand all"}
              </button>
              <button type="button" style={treeToolBtn} title="Hide the date tree" onClick={() => setTreeHidden(true)}>
                ◄
              </button>
            </span>
          </div>

          {hierarchy.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: "1.03em" }}>
              No saved return reports for the selected period.
            </div>
          )}

          {hierarchy.map(({ year, months }) => {
            const yOpen = !!openYears[year];
            const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
            return (
              <div key={year} style={treeSection}>
                <div style={{ ...treeHeader, background: yOpen ? "#e0f2fe" : "#eff6ff" }} onClick={() => setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))}>
                  <span>{yOpen ? "▼" : "►"} Year {year}</span>
                  <span style={{ fontWeight: 700 }}>{yearCount} day(s)</span>
                </div>

                {yOpen && (
                  <div style={{ padding: "6px 0" }}>
                    {months.map(({ month, days }) => {
                      const key = year + "-" + month;
                      const mOpen = !!openMonths[key];
                      return (
                        <div key={key} style={{ margin: "4px 0 6px" }}>
                          <div style={{ ...treeSubHeader, background: mOpen ? "#f0f9ff" : "#ffffff" }} onClick={() => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))}>
                            <span>{mOpen ? "▾" : "▸"} Month {month}</span>
                            <span>{days.length} day(s)</span>
                          </div>

                          {mOpen && (
                            <div>
                              {days.map((d) => {
                                const isSelected = selectedDate === d;
                                return (
                                  <div key={d} style={{ ...treeDay, background: isSelected ? "#e0f2fe" : "#fff", borderLeft: isSelected ? "5px solid #3b82f6" : "none" }} onClick={() => setSelectedDate(d)}>
                                    <div>📅 {d}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Right panel */}
        <div style={rightPanel}>
          {selectedReport ? (
            <div>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: "bold", color: "#111", fontSize: "1.2em" }}>
                  Returns Report Details ({selectedReport.reportDate})
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={handleExportPDF} style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer" }}>
                    ⬇️ Export PDF
                  </button>
                  {!bulkEdit && (selectedReport.items || []).length > 0 && (
                    <button onClick={startBulkEdit} style={bulkEditBtn}>✏️ Edit All</button>
                  )}
                  {!bulkEdit && <button onClick={startAddRow} style={addRowBtn}>➕ Add Row</button>}
                  {!bulkEdit && (
                    <button onClick={openDateMove} style={dateMoveBtn} title="File this whole day under a different date">
                      📅 Change Date
                    </button>
                  )}
                  {!bulkEdit && <button onClick={handleDeleteDay} style={deleteBtnMain} data-delete-action="true">🗑️ Delete This Day Report</button>}
                </div>
              </div>

              {/* ✅ Summary bar */}
              {selectedSummary && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                  <div style={summaryChip("#512e5f", "#f5eeff")}>📝 Items: <strong>{selectedSummary.count}</strong></div>
                  {selectedSummary.kg > 0 && <div style={summaryChip("#155e75", "#ecfeff")}>⚖️ KG: <strong>{selectedSummary.kg.toFixed(2)}</strong></div>}
                  {selectedSummary.pcs > 0 && <div style={summaryChip("#065f46", "#ecfdf5")}>📦 PCS: <strong>{selectedSummary.pcs}</strong></div>}
                  {selectedSummary.plate > 0 && <div style={summaryChip("#5b21b6", "#f5f3ff")}>🍽️ PLATE: <strong>{selectedSummary.plate}</strong></div>}
                  {selectedSummary.other > 0 && <div style={summaryChip("#7c2d12", "#fff7ed")}>🔢 Other: <strong>{selectedSummary.other.toFixed(2)}</strong></div>}
                </div>
              )}

              {/* ✅ Row search (hidden while bulk editing) */}
              {!bulkEdit && (
                <div style={{ marginBottom: 10 }}>
                  <input
                    value={rowSearch}
                    onChange={(e) => setRowSearch(e.target.value)}
                    placeholder="🔍 Search within table rows (item code, transfer no, product, branch, action, expiry…)"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 14px", borderRadius: 10, border: "1.5px solid #93c5fd", background: "#eff6ff", fontSize: "0.97em", color: "#111" }}
                  />
                  {rowSearch && (
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                      Showing {filteredRows.length} of {(selectedReport.items || []).length} rows
                      <button onClick={() => setRowSearch("")} style={{ marginLeft: 8, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>✕ Clear</button>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ Bulk edit sticky toolbar */}
              {bulkEdit && (
                <div style={bulkBar}>
                  <span style={{ fontWeight: 800, color: "#1e3a8a", fontSize: "1.02em" }}>
                    ✏️ Bulk edit — <strong>{bulkRows.filter((r) => !r._removed).length}</strong> row(s) being edited
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={saveBulkEdit} disabled={bulkSaving} style={{ ...bulkSaveBtn, opacity: bulkSaving ? 0.6 : 1, cursor: bulkSaving ? "not-allowed" : "pointer" }}>
                      {bulkSaving ? "⏳ Saving…" : "💾 Save All"}
                    </button>
                    <button onClick={cancelBulkEdit} disabled={bulkSaving} style={bulkCancelBtn}>✖ Cancel</button>
                  </div>
                </div>
              )}

              <style>{`
                .rv-detail-table { border-collapse: separate; border-spacing: 0; }
                .rv-detail-table thead th { position: sticky; top: 0; z-index: 2; }
                .rv-row { transition: background .15s ease; }
                .rv-row:hover td { background: #eff6ff !important; }
                .rv-detail-table input:focus, .rv-detail-table select:focus {
                  outline: none; border-color: #38bdf8;
                  box-shadow: 0 0 0 3px rgba(56,189,248,.25); background: #fff;
                }
              `}</style>
              <div style={detailTableWrap}>
                <table style={detailTable} className="rv-detail-table">
                  <thead>
                    <tr>
                      <th style={{ ...thS, borderTopLeftRadius: 12 }}>SL.NO</th>
                      <th style={thS}>ITEM CODE</th>
                      <th style={thS}>PRODUCT NAME</th>
                      <th style={thS}>ORIGIN</th>
                      <th style={thS}>BUTCHERY</th>
                      <th style={thS}>TRANSFER NO</th>
                      <th style={thS}>QUANTITY</th>
                      <th style={thS}>QTY TYPE</th>
                      <th style={thS}>EXPIRY DATE</th>
                      <th style={thS}>REMARKS</th>
                      <th style={thS}>ACTION</th>
                      <th style={{ ...thS, borderTopRightRadius: 12 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const i = row._origIdx;
                      const editing = editRowIdx === i || bulkEdit;
                      const draft = bulkEdit ? (bulkRows[i] || {}) : editRowData;
                      const upd = (patch) => bulkEdit
                        ? updateBulkRow(i, patch)
                        : setEditRowData((s) => ({ ...s, ...patch }));
                      const removed = bulkEdit && draft._removed;
                      const rowBg = removed ? "#fef2f2" : bulkEdit ? "#fffdf5" : (i % 2 ? "#f8fbff" : "#ffffff");

                      // A row marked for removal during bulk edit — show a slim "undo" line
                      if (removed) {
                        return (
                          <tr key={i} style={{ background: rowBg }}>
                            <td style={tdS}>{i + 1}</td>
                            <td style={{ ...tdS, textAlign: "left", color: "#b91c1c", textDecoration: "line-through" }} colSpan={7}>
                              {draft.productName || "—"} — will be removed on save
                            </td>
                            <td style={tdS}>
                              <button onClick={() => toggleBulkRemove(i)} style={undoBtn} title="Keep this row">↩ Undo</button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={i} className="rv-row" style={{ background: rowBg }}>
                          <td style={{ ...tdS, fontWeight: 700, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>

                          {/* ITEM CODE */}
                          <td style={tdS}>
                            {editing ? (
                              <CodeSuggest
                                style={cellInputStyle}
                                placeholder="ITEM CODE"
                                value={draft.itemCode || ""}
                                onChange={(v) => upd(codeFieldPatch(v))}
                                onPick={(it) => upd({ itemCode: it.item_code, productName: it.description || "", ...(it.origin ? { origin: it.origin } : {}) })}
                                search={catalogSearch}
                              />
                            ) : row.itemCode || ""}
                          </td>

                          {/* PRODUCT */}
                          <td style={tdS}>
                            {editing ? (
                              <input style={cellInputStyle} value={draft.productName || ""} onChange={(e) => upd({ productName: e.target.value })} placeholder="PRODUCT NAME" />
                            ) : row.productName}
                          </td>

                          {/* ORIGIN */}
                          <td style={tdS}>
                            {editing ? (
                              <input style={cellInputStyle} value={draft.origin || ""} onChange={(e) => upd({ origin: e.target.value })} placeholder="ORIGIN" />
                            ) : row.origin}
                          </td>

                          {/* BUTCHERY */}
                          <td style={tdS}>
                            {editing ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <select style={cellInputStyle} value={draft.butchery || ""} onChange={(e) => upd({ butchery: e.target.value, customButchery: isOtherBranch(e.target.value) ? draft.customButchery : "" })}>
                                  <option value="">— Select a branch —</option>
                                  {BRANCHES.map((b) => <option key={b} value={b}>{isOtherBranch(b) ? "Other branch" : b}</option>)}
                                </select>
                                {isOtherBranch(draft.butchery) && (
                                  <input style={cellInputStyle} value={draft.customButchery || ""} onChange={(e) => upd({ customButchery: e.target.value })} placeholder="Enter branch name" />
                                )}
                              </div>
                            ) : safeButchery(row)}
                          </td>

                          {/* TRANSFER NO */}
                          <td style={tdS}>
                            {editing ? (
                              <input style={cellInputStyle} value={draft.transferNo || ""} onChange={(e) => upd({ transferNo: e.target.value })} placeholder="TRANSFER NO" />
                            ) : row.transferNo || ""}
                          </td>

                          {/* QUANTITY — the weight printed on the branch transfer note */}
                          <td style={tdS}>
                            {editing ? (
                              <input style={cellInputStyle} type="number" min="0" step="0.001" value={draft.quantity ?? ""} onChange={(e) => upd({ quantity: e.target.value })} placeholder="QTY" />
                            ) : (
                              <span>
                                <span style={{ fontWeight: 700 }}>{row.quantity}</span>
                                {Number(row.splitOf) > 0 && (
                                  <span style={splitLineageChip} title={`Part of an original ${row.splitOf} ${qtyUnit(row)} line that was split`}>
                                    ✂️ of {row.splitOf}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>

                          {/* QTY TYPE */}
                          <td style={tdS}>
                            {editing ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <input style={cellInputStyle} value={draft.qtyType || ""} onChange={(e) => upd({ qtyType: e.target.value })} placeholder="QTY TYPE" />
                                <input style={cellInputStyle} value={draft.customQtyType || ""} onChange={(e) => upd({ customQtyType: e.target.value })} placeholder='Custom QTY TYPE' />
                              </div>
                            ) : row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}
                          </td>

                          {/* EXPIRY — ✅ type="date" instead of text */}
                          <td style={tdS}>
                            {editing ? (
                              <input type="date" style={cellInputStyle} value={draft.expiry || ""} onChange={(e) => upd({ expiry: e.target.value })} />
                            ) : row.expiry}
                          </td>

                          {/* REMARKS */}
                          <td style={tdS}>
                            {editing ? (
                              <input style={cellInputStyle} value={draft.remarks || ""} onChange={(e) => upd({ remarks: e.target.value })} placeholder="REMARKS" />
                            ) : row.remarks}
                          </td>

                          {/* ACTION */}
                          <td style={tdS}>
                            {editing ? (
                              <div>
                                <select value={draft.action || ""} onChange={(e) => upd({ action: e.target.value })} style={cellInputStyle}>
                                  {ACTIONS.map((act) => <option value={act} key={act}>{act === "إجراء آخر..." ? "Other action..." : act}</option>)}
                                </select>
                                {draft.action === "إجراء آخر..." && (
                                  <input value={draft.customAction || ""} onChange={(e) => upd({ customAction: e.target.value })} placeholder="Specify action…" style={{ ...cellInputStyle, marginTop: 6 }} />
                                )}
                              </div>
                            ) : row.action === "إجراء آخر..." ? row.customAction : row.action}
                          </td>

                          {/* ROW BUTTONS */}
                          <td style={tdS}>
                            {bulkEdit ? (
                              <button onClick={() => toggleBulkRemove(i)} style={rowDeleteBtn} data-delete-action="true" title="Remove this row">🗑️</button>
                            ) : editRowIdx === i ? (
                              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                                <button onClick={saveRow} style={saveBtn}>Save</button>
                                <button onClick={cancelEditRow} style={cancelBtn}>Cancel</button>
                                <button onClick={() => openImagesFor(i)} style={imageBtn}>🖼️ {row.images?.length || 0}/{MAX_IMAGES_PER_PRODUCT}</button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                                <button onClick={() => startEditRow(i)} style={editBtn}>✏️ Edit</button>
                                <button
                                  onClick={() => openSplit(i)}
                                  style={splitBtn}
                                  title="Give part of this quantity a different action (condemn 3 of 6 KG, …)"
                                >
                                  ✂️ Split
                                </button>
                                <button onClick={() => deleteRow(i)} style={rowDeleteBtn}>🗑️</button>
                                <button onClick={() => openImagesFor(i)} style={imageBtn}>🖼️ {row.images?.length || 0}/{MAX_IMAGES_PER_PRODUCT}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* New row when adding */}
                    {addingRow && editRowIdx === (selectedReport.items || []).length && (
                      <tr style={{ background: "#fefce8" }}>
                        <td style={tdS}>{(selectedReport.items || []).length + 1}</td>
                        <td style={tdS}>
                          <CodeSuggest
                            style={cellInputStyle}
                            placeholder="ITEM CODE"
                            value={editRowData.itemCode || ""}
                            onChange={(v) => setEditRowData((s) => ({ ...s, ...codeFieldPatch(v) }))}
                            onPick={(it) => setEditRowData((s) => ({ ...s, itemCode: it.item_code, productName: it.description || "", ...(it.origin ? { origin: it.origin } : {}) }))}
                            search={catalogSearch}
                          />
                        </td>
                        <td style={tdS}><input style={cellInputStyle} value={editRowData.productName} onChange={(e) => setEditRowData((s) => ({ ...s, productName: e.target.value }))} placeholder="PRODUCT NAME" /></td>
                        <td style={tdS}><input style={cellInputStyle} value={editRowData.origin} onChange={(e) => setEditRowData((s) => ({ ...s, origin: e.target.value }))} placeholder="ORIGIN" /></td>
                        <td style={tdS}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <select style={cellInputStyle} value={editRowData.butchery} onChange={(e) => setEditRowData((s) => ({ ...s, butchery: e.target.value, customButchery: isOtherBranch(e.target.value) ? s.customButchery : "" }))}>
                              <option value="">— Select a branch —</option>
                              {BRANCHES.map((b) => <option key={b} value={b}>{isOtherBranch(b) ? "Other branch" : b}</option>)}
                            </select>
                            {isOtherBranch(editRowData.butchery) && (
                              <input style={cellInputStyle} value={editRowData.customButchery} onChange={(e) => setEditRowData((s) => ({ ...s, customButchery: e.target.value }))} placeholder="Enter branch name" />
                            )}
                          </div>
                        </td>
                        <td style={tdS}><input style={cellInputStyle} value={editRowData.transferNo || ""} onChange={(e) => setEditRowData((s) => ({ ...s, transferNo: e.target.value }))} placeholder="TRANSFER NO" /></td>
                        <td style={tdS}><input style={cellInputStyle} type="number" min="0" step="0.001" value={editRowData.quantity} onChange={(e) => setEditRowData((s) => ({ ...s, quantity: e.target.value }))} placeholder="QTY" /></td>
                        <td style={tdS}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input style={cellInputStyle} value={editRowData.qtyType} onChange={(e) => setEditRowData((s) => ({ ...s, qtyType: e.target.value }))} placeholder="QTY TYPE" />
                            <input style={cellInputStyle} value={editRowData.customQtyType} onChange={(e) => setEditRowData((s) => ({ ...s, customQtyType: e.target.value }))} placeholder="Custom QTY TYPE" />
                          </div>
                        </td>
                        {/* ✅ type="date" for new row too */}
                        <td style={tdS}><input type="date" style={cellInputStyle} value={editRowData.expiry} onChange={(e) => setEditRowData((s) => ({ ...s, expiry: e.target.value }))} /></td>
                        <td style={tdS}><input style={cellInputStyle} value={editRowData.remarks} onChange={(e) => setEditRowData((s) => ({ ...s, remarks: e.target.value }))} placeholder="REMARKS" /></td>
                        <td style={tdS}>
                          <select value={editRowData.action} onChange={(e) => setEditRowData((s) => ({ ...s, action: e.target.value }))} style={cellInputStyle}>
                            {ACTIONS.map((act) => <option value={act} key={act}>{act === "إجراء آخر..." ? "Other action..." : act}</option>)}
                          </select>
                          {editRowData.action === "إجراء آخر..." && (
                            <input value={editRowData.customAction} onChange={(e) => setEditRowData((s) => ({ ...s, customAction: e.target.value }))} placeholder="Specify action…" style={{ ...cellInputStyle, marginTop: 6 }} />
                          )}
                        </td>
                        <td style={tdS}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={saveRow} style={saveBtn}>Save</button>
                            <button onClick={cancelEditRow} style={cancelBtn}>Cancel</button>
                            <button onClick={() => openImagesFor(editRowIdx)} style={imageBtn}>🖼️ {editRowData.images?.length || 0}/{MAX_IMAGES_PER_PRODUCT}</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* The two names the sheet was closed with. Read-only here: the
                  signatures are given on the input form, and this screen edits
                  rows - it must never look like a place to sign for someone. */}
              <div style={signRow}>
                <div style={signCell}>
                  <span style={signLabel}>Checked by</span>
                  <span style={selectedReport.checkedBy ? signName : signBlank}>
                    {selectedReport.checkedBy || "not signed"}
                  </span>
                </div>
                <div style={signCell}>
                  <span style={signLabel}>Verified by</span>
                  <span style={selectedReport.verifiedBy ? signName : signBlank}>
                    {selectedReport.verifiedBy || "not signed"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#6b7280", padding: 80, fontSize: "1.05em" }}>
              Select a date from the list to view its details.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ImageManagerModal
        open={imageModalOpen}
        row={activeRow}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
        remaining={remainingForActive}
      />

      {/* ✂️ Split-quantity Modal */}
      <SplitQtyModal
        open={splitState.open}
        row={splitState.idx >= 0 ? (selectedReport?.items?.[splitState.idx] ?? null) : null}
        draft={splitState}
        busy={splitBusy}
        onChange={(patch) => setSplitState((st) => ({ ...st, ...patch }))}
        onCancel={() => { if (!splitBusy) closeSplit(); }}
        onConfirm={confirmSplit}
      />

      {/* 📅 Change-date Modal */}
      <ChangeDateModal
        open={dateMove.open && !!selectedReport}
        fromDate={selectedReport?.reportDate || ""}
        value={dateMove.value}
        busy={dateMove.busy}
        rowCount={(selectedReport?.items || []).length}
        target={
          dateMove.value && dateMove.value !== selectedReport?.reportDate
            ? reports.find((r) => r.reportDate === dateMove.value) || null
            : null
        }
        onChange={(v) => setDateMove((s) => ({ ...s, value: v }))}
        onCancel={closeDateMove}
        onConfirm={confirmDateMove}
      />

      {/* ✅ Confirm Modal */}
      <ConfirmModal
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        confirmColor={confirmState.confirmColor}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

/* ========== Small components ========== */
function KpiCard({ title, value, emoji }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.2rem", textAlign: "center", boxShadow: "0 2px 12px #e8daef66", color: "#111" }}>
      {emoji && <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>}
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: "1.7em", fontWeight: 800 }}>{value}</div>
    </div>
  );
}
function KpiList({ title, entries = [] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.2rem", boxShadow: "0 2px 12px #e8daef66", color: "#111" }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>{title}</div>
      {entries.length === 0 ? <div style={{ color: "#6b7280" }}>—</div> : entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between" }}><span>{k}</span><b>{v}</b></div>
      ))}
    </div>
  );
}

/* ========== Helpers / Styles ========== */
function sortTop(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

const summaryChip = (color, bg) => ({
  background: bg, color, border: `1.5px solid ${color}33`, borderRadius: 10,
  padding: "6px 14px", fontWeight: 700, fontSize: 14,
});

const leftTree = { minWidth: 280, background: "#fff", borderRadius: 12, boxShadow: "0 1px 10px #e8daef66", padding: "6px 0", border: "1px solid #e5e7eb", maxHeight: "70vh", overflow: "auto", color: "#111" };
const treeToolbar = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e5e7eb", zIndex: 2 };
const treeToolBtn = { border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 9, padding: "3px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer" };
const treeRail = { minWidth: 46, width: 46, background: "#fff", borderRadius: 12, boxShadow: "0 1px 10px #e8daef66", border: "1px solid #e5e7eb", padding: "12px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, alignSelf: "flex-start" };
const treeRailLabel = { writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: ".04em", whiteSpace: "nowrap" };
const treeSection = { marginBottom: 4 };
const treeHeader = { display: "flex", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", fontWeight: 800, color: "#111", borderBottom: "1px solid #e5e7eb" };
const treeSubHeader = { display: "flex", justifyContent: "space-between", padding: "8px 14px", cursor: "pointer", color: "#111", borderBottom: "1px dashed #e5e7eb" };
const treeDay = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", cursor: "pointer", borderBottom: "1px dashed #e5e7eb", fontSize: "0.98em", color: "#111" };
const rightPanel = { flex: 1, background: "#fff", borderRadius: 15, boxShadow: "0 1px 12px #e8daef44", minHeight: 320, padding: "25px 28px", color: "#111" };

/* ===== Modern table (Soft-Sky) ===== */
const detailTableWrap = { overflowX: "auto", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 6px 22px rgba(2,132,199,.10)", background: "#fff", marginTop: 6 };
const detailTable = { width: "100%", background: "#fff", minWidth: 950, color: "#0f172a", fontSize: "0.93em" };
const thS = { padding: "13px 10px", textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: ".6px", textTransform: "uppercase", color: "#0c4a6e", background: "linear-gradient(180deg, #eff6ff, #e0f2fe)", borderBottom: "2px solid #bae6fd", whiteSpace: "nowrap" };
const tdS = { padding: "11px 10px", textAlign: "center", minWidth: 90, borderBottom: "1px solid #eef2f7", color: "#1e293b", verticalAlign: "middle" };
const cellInputStyle = { padding: "7px 10px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: "0.95em", transition: "border-color .15s, box-shadow .15s" };
const dateInputStyle = { borderRadius: 8, border: "1.5px solid #93c5fd", background: "#eff6ff", padding: "7px 13px", fontSize: "1em", minWidth: 120, color: "#111" };
const clearBtn = { background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "7px 18px", fontWeight: "bold", fontSize: "1em", cursor: "pointer" };
const saveBtn = { background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: "bold", cursor: "pointer" };
const cancelBtn = { background: "#9ca3af", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontWeight: "bold", cursor: "pointer" };
const editBtn = { background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, padding: "4px 10px", cursor: "pointer" };
const imageBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, padding: "4px 10px", cursor: "pointer" };
const deleteBtnMain = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer" };
const addRowBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer" };
const dateMoveBtn = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 8px #bae6fd" };
const rowDeleteBtn = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, padding: "4px 8px", cursor: "pointer" };

/* ===== The signature strip under a day's rows ===== */
const signRow = { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" };
const signCell = { flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 4 };
const signLabel = { fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: ".3px", textTransform: "uppercase" };
const signName = { fontSize: "1.02em", fontWeight: 800, color: "#0f172a" };
const signBlank = { fontSize: "1.02em", fontWeight: 700, color: "#94a3b8", fontStyle: "italic" };

/* ===== Bulk edit styles (same Soft-Sky palette) ===== */
const bulkEditBtn = { background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 8px #bae6fd" };
const bulkBar = { position: "sticky", top: 0, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10, padding: "10px 14px", borderRadius: 12, background: "linear-gradient(135deg, #eff6ff, #e0e7ff)", border: "1.5px solid #93c5fd", boxShadow: "0 2px 12px #c7d2fe66" };
const bulkSaveBtn = { background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: "bold", fontSize: "1em", cursor: "pointer", boxShadow: "0 2px 8px #a7f3d0" };
const bulkCancelBtn = { background: "#fff", color: "#475569", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "9px 16px", fontWeight: "bold", fontSize: "1em", cursor: "pointer" };
const undoBtn = { background: "#fff", color: "#b91c1c", border: "1.5px solid #fecaca", borderRadius: 8, padding: "4px 10px", fontWeight: "bold", fontSize: 13, cursor: "pointer" };

const galleryBack = { position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 };
const galleryCard = { width: "min(1400px, 96vw)", maxHeight: "80vh", overflow: "auto", background: "#fff", color: "#111", borderRadius: 14, border: "1px solid #e5e7eb", padding: "14px 16px", boxShadow: "0 12px 32px rgba(0,0,0,.25)" };
const galleryClose = { background: "transparent", border: "none", color: "#111", fontWeight: 900, cursor: "pointer", fontSize: 18 };
const btnBlue = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer" };
const thumbsWrap = { marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 };
const thumbTile = { position: "relative", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#f8fafc" };
const thumbImg = { width: "100%", height: 150, objectFit: "cover", display: "block" };

/* ===== Search by number ===== */
const numBar = { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e2e8f0" };
const numInput = { flex: "1 1 320px", maxWidth: 520, boxSizing: "border-box", padding: "8px 14px", borderRadius: 10, border: "1.5px solid #93c5fd", background: "#eff6ff", fontSize: "0.97em", color: "#111" };
const numResultsWrap = { marginTop: 10, maxHeight: 300, overflow: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" };

/* ===== Split quantity ===== */
const splitBtn = { background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, padding: "4px 10px", cursor: "pointer" };
const splitLineageChip = { display: "inline-block", marginLeft: 6, padding: "1px 7px", borderRadius: 999, background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const splitCard = { width: "min(620px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "#fff", color: "#0f172a", borderRadius: 16, border: "1px solid #e5e7eb", padding: "18px 20px", boxShadow: "0 12px 34px rgba(0,0,0,.25)", fontFamily: "Cairo, sans-serif" };
const splitFactsRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12 };
const splitFact = { display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13 };
const splitFactLbl = { fontSize: 11, fontWeight: 800, letterSpacing: ".4px", textTransform: "uppercase", color: "#64748b" };
const splitLbl = { display: "block", fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 6 };
const splitChipBtn = { background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #bfdbfe", borderRadius: 9, padding: "6px 12px", fontWeight: 800, fontSize: 13, cursor: "pointer" };
const splitWarn = { marginTop: 6, fontSize: 12, fontWeight: 700, color: "#b91c1c" };
const splitPreview = { marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1.5px solid #fcd34d", display: "flex", flexDirection: "column", gap: 6 };
const splitPreviewRow = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14 };
const splitKeep = { padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 12 };
const splitMove = { padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 12 };
const thumbRemove = { position: "absolute", top: 6, right: 6, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "2px 8px", fontWeight: 800, cursor: "pointer" };