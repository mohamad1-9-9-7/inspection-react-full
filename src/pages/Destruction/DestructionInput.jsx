// src/pages/Destruction/DestructionInput.jsx
//
// إدخال — سجل إعدام المواد / Material Destruction & Condemnation Register.
// Same shape and tooling as the Returns / ENOC Returns registers:
//   • server is the source of truth (POST/PUT /api/reports, type=destruction_record)
//   • images go to Cloudinary through /api/images (never base64 in the payload)
//   • product catalog comes from the shared Returns catalog (items.json + custom)
//   • localStorage is used only as a draft cache

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import {
  useProductCatalog,
  normalizeCode,
} from "../monitor/branches/_shared/ProductPicker";
import CodeSuggest from "../shared/CodeSuggest";
import {
  TYPE,
  BRANCHES,
  OTHER,
  OTHER_BRANCH,
  REASONS,
  METHODS,
  QTY_TYPES,
  blankHeader,
  blankItem,
  computeTotals,
  fmt2,
  getToday,
  isCustomReason,
  itemReasons,
  lineValue,
  prepareItem,
  rowHasData,
  safeArr,
} from "./destructionOptions";
import {
  FIELDS,
  buildRows,
  firstColumn,
  guessMapping,
  looksLikeHeader,
  matrixIsSingleColumn,
  parseClipboard,
  qtyTypeFromUom,
} from "./excelPaste";

const DRAFT_KEY = "destruction_draft_v1";

/* Codes + weights is the copy the stores actually make, so a block of those
   fills the table straight away; anything wider goes through the mapping modal
   where every column can be checked first. */
const DIRECT_FIELDS = new Set(["ignore", "itemCode", "productName", "quantity", "qtyType"]);

/* ================= server helpers ================= */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

async function deleteImage(url) {
  if (!url) return;
  await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  }).catch(() => {});
}

function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}

/** Find an already-saved report for the same date (multi-per-day is not wanted here). */
async function findReportForDate(reportDate) {
  const target = String(reportDate || "").slice(0, 10);
  try {
    // Targeted read: the server matches the business date and returns just that
    // record. Fetching the type alone became limit=5000 on the way out, so the
    // whole archive travelled here to look up a single day.
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(target)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const arr =
      (Array.isArray(data) && data) ||
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.reports) && data.reports) ||
      (Array.isArray(data?.data) && data.data) ||
      [];
    return (
      arr.find((r) => {
        const d = r?.payload?.reportDate || r?.reportDate || r?.date || "";
        return String(d).slice(0, 10) === target;
      }) || null
    );
  } catch {
    return null;
  }
}

async function createReport(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "anonymous", type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json();
}

/* PUT by id — never the generic PUT /api/reports, which upserts by (type,date). */
async function updateReportById(id, payload) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

/* ================= images modal ================= */
function ImageManagerModal({ open, title, hint, images, onClose, onAddImages, onRemoveImage }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) setPreviewSrc("");
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const f of files) {
      try {
        urls.push(await uploadViaServer(f));
      } catch (err) {
        console.error("upload failed:", err);
      }
    }
    if (urls.length) onAddImages(urls);
    e.target.value = "";
    setUploading(false);
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={galleryTop}>
          <div style={galleryTitle}>{title || "📷 Destruction Evidence"}</div>
          <button onClick={onClose} style={galleryClose}>
            ✕
          </button>
        </div>

        {previewSrc && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img src={previewSrc} alt="preview" style={previewImg} />
          </div>
        )}

        <div style={galleryActions}>
          <button
            onClick={() => inputRef.current?.click()}
            style={btnBlue}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload photos"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
            {hint || "Attach before / after destruction photos as evidence."}
          </div>
        </div>

        <div style={thumbsWrap}>
          {safeArr(images).length === 0 ? (
            <div style={{ color: "#64748b", fontWeight: 800 }}>No photos yet.</div>
          ) : (
            safeArr(images).map((src, i) => (
              <div key={i} style={thumbTile}>
                <img
                  src={src}
                  alt={`img-${i}`}
                  style={thumbImg}
                  onClick={() => setPreviewSrc(src)}
                />
                <button
                  title="Remove"
                  onClick={() => onRemoveImage(i)}
                  style={thumbRemove}
                  data-delete-action="true"
                >
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

/* ================= Excel paste modal =================
   The store lists live in Excel. The whole block is pasted here, each column is
   mapped to a field (guessed first, changeable by hand) and the result is shown
   before it reaches the table — a paste never overwrites work silently. */
function ExcelPasteModal({ open, initialText, catalog, onClose, onApply }) {
  const [text, setText] = useState("");
  const [headerRow, setHeaderRow] = useState(false);
  const [mapping, setMapping] = useState([]);
  const areaRef = useRef(null);
  const signature = useRef("");

  useEffect(() => {
    if (!open) return;
    setText(initialText || "");
    signature.current = "";
    setTimeout(() => areaRef.current?.focus(), 40);
  }, [open, initialText]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const matrix = useMemo(() => parseClipboard(text), [text]);

  /* Re-guess whenever a genuinely different block is pasted, never while the
     user is adjusting the dropdowns. */
  useEffect(() => {
    if (!matrix.length) {
      signature.current = "";
      setMapping([]);
      return;
    }
    const sig = `${matrix.length}|${matrix[0].length}|${matrix[0].join("~")}`;
    if (sig === signature.current) return;
    signature.current = sig;
    const hdr = looksLikeHeader(matrix[0], catalog.isKnownCode);
    setHeaderRow(hdr);
    setMapping(guessMapping(matrix, { headerRow: hdr, isKnownCode: catalog.isKnownCode }));
  }, [matrix, catalog]);

  const body = useMemo(
    () => (headerRow ? matrix.slice(1) : matrix),
    [matrix, headerRow]
  );

  const built = useMemo(
    () => (mapping.length ? buildRows(body, mapping, catalog) : []),
    [body, mapping, catalog]
  );

  if (!open) return null;

  const hasCode = mapping.includes("itemCode");
  const unmatched = built.filter((b) => b.hasCode && !b.matched).length;
  const missing = built.filter((b) => !b.hasCode).length;

  const setColumn = (col, field) =>
    setMapping((prev) => {
      const next = [...prev];
      /* one field per column — taking it frees the column that had it */
      if (field !== "ignore") {
        for (let i = 0; i < next.length; i += 1) if (next[i] === field) next[i] = "ignore";
      }
      next[col] = field;
      return next;
    });

  const toggleHeader = () => {
    const hdr = !headerRow;
    setHeaderRow(hdr);
    setMapping(guessMapping(matrix, { headerRow: hdr, isKnownCode: catalog.isKnownCode }));
  };

  const apply = (mode) => {
    if (!built.length) return;
    onApply(built.map((b) => b.row), mode);
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={pasteCard} onClick={(e) => e.stopPropagation()}>
        <div style={galleryTop}>
          <div style={galleryTitle}>📋 Paste from Excel — لصق من الإكسل</div>
          <button onClick={onClose} style={galleryClose}>
            ✕
          </button>
        </div>

        <div style={pasteHint}>
          Copy the rows in Excel (the codes column on its own is enough) and press
          Ctrl+V in the box below. Dates are read as DD/MM/YYYY.
        </div>

        <textarea
          ref={areaRef}
          style={pasteArea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"10001\t Beef Cube \t12\tKG\n10002\t Lamb Leg \t8\tKG"}
          spellCheck={false}
        />

        {matrix.length > 0 && (
          <>
            <div style={pasteBar}>
              <label style={pasteCheck}>
                <input type="checkbox" checked={headerRow} onChange={toggleHeader} />
                <span>First line is a header</span>
              </label>
              <span style={pasteCount}>{built.length} rows</span>
              {hasCode ? (
                <>
                  <span style={pasteOk}>{built.length - unmatched - missing} matched</span>
                  {unmatched > 0 && <span style={pasteWarn}>{unmatched} not in the catalog</span>}
                  {missing > 0 && <span style={pasteWarn}>{missing} with no code</span>}
                </>
              ) : (
                <span style={pasteWarn}>No column is mapped to the item code</span>
              )}
            </div>

            <div style={pastePreviewWrap}>
              <table style={pastePreview}>
                <thead>
                  <tr>
                    <th style={pasteTh}>#</th>
                    {mapping.map((field, col) => (
                      <th key={col} style={pasteTh}>
                        <select
                          value={field}
                          onChange={(e) => setColumn(col, e.target.value)}
                          style={pasteSelect}
                        >
                          {FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        {headerRow && matrix[0][col] ? (
                          <div style={pasteHeadCell}>{matrix[0][col]}</div>
                        ) : null}
                      </th>
                    ))}
                    <th style={pasteTh}>Product read</th>
                  </tr>
                </thead>
                <tbody>
                  {body.slice(0, 60).map((cells, i) => {
                    const info = built[i];
                    return (
                      <tr key={i} style={{ background: i % 2 ? "#fdf7f7" : "#fff" }}>
                        <td style={pasteTd}>{i + 1}</td>
                        {mapping.map((field, col) => (
                          <td
                            key={col}
                            style={{
                              ...pasteTd,
                              color: field === "ignore" ? "#cbd5e1" : "#0f172a",
                            }}
                          >
                            {cells[col]}
                          </td>
                        ))}
                        <td style={pasteTd}>
                          {info?.matched ? (
                            <span style={pasteOkCell}>✔ {info.row.productName}</span>
                          ) : info?.hasCode ? (
                            <span style={pasteWarnCell}>⚠ code not in the catalog</span>
                          ) : (
                            <span style={pasteWarnCell}>⚠ no item code</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {body.length > 60 && (
                <div style={pasteMore}>… {body.length - 60} more rows will be added too.</div>
              )}
            </div>
          </>
        )}

        <div style={pasteActions}>
          <button onClick={() => apply("append")} disabled={!built.length} style={btnBlue}>
            ➕ Add {built.length || ""} rows
          </button>
          <button onClick={() => apply("replace")} disabled={!built.length} style={btnReplace}>
            ♻ Replace the table
          </button>
          <button onClick={onClose} style={btnGhost}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== PAGE ====================== */
export default function DestructionInput() {
  const navigate = useNavigate();
  const { allItems } = useProductCatalog();

  const [reportDate, setReportDate] = useState(getToday());
  const [header, setHeader] = useState(blankHeader());
  const [rows, setRows] = useState([blankItem()]);

  const [rowErrors, setRowErrors] = useState({});
  const [headerErrors, setHeaderErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const flash = (msg, ms = 2500) => {
    setSaveMsg(msg);
    if (ms) setTimeout(() => setSaveMsg(""), ms);
  };

  /* ===== draft cache ===== */
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data?.reportDate === "string") setReportDate(data.reportDate);
        if (data?.header && typeof data.header === "object") {
          setHeader({ ...blankHeader(), ...data.header });
        }
        if (Array.isArray(data?.rows) && data.rows.length) setRows(data.rows);
        const draftPhotos = safeArr(data?.header?.images).length;
        if (data?.rows || data?.header) {
          flash(
            draftPhotos
              ? `Draft loaded — it still carries ${draftPhotos} photo(s). Clear them if they belong to an earlier record.`
              : "Draft loaded.",
            draftPhotos ? 6000 : 1500
          );
        }
      }
    } catch {
      /* ignore */
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ reportDate, header, rows, ts: Date.now() })
        );
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [reportDate, header, rows]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setHeader(blankHeader());
    setRows([blankItem()]);
    setRowErrors({});
    setHeaderErrors({});
    flash("Draft cleared.", 1500);
  };

  /* ===== catalog lookup ===== */
  const byCode = useMemo(() => {
    const m = new Map();
    for (const it of allItems) m.set(normalizeCode(it.item_code), it);
    return m;
  }, [allItems]);

  /* Suggestion source for CodeSuggest — same ranking as Returns: a code that
     starts with what was typed first, then any code or name containing it. */
  const localSearch = (q) => {
    const s = normalizeCode(q);
    if (!s) return allItems.slice(0, 20);
    const starts = [];
    const rest = [];
    for (const it of allItems) {
      const code = normalizeCode(it.item_code);
      const name = normalizeCode(it.description);
      if (code.startsWith(s)) starts.push(it);
      else if (code.includes(s) || name.includes(s)) rest.push(it);
      if (starts.length >= 20) break;
    }
    return starts.concat(rest).slice(0, 20);
  };

  /* Everything the item code owns, in one place. The product name mirrors the
     code strictly (blank when the code matches nothing); the unit only changes
     when the catalog actually states one. */
  const catalogPatch = (hit) => {
    const patch = { productName: hit ? hit.description : "" };
    const q = hit ? qtyTypeFromUom(hit.uom) : null;
    if (q) {
      patch.qtyType = q.qtyType;
      patch.customQtyType = q.customQtyType;
    }
    return patch;
  };

  const pickItem = (idx, item) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, itemCode: item.item_code, ...catalogPatch(item) } : r
      )
    );

  const isKnownCode = (code) => {
    const s = normalizeCode(code);
    return !!s && byCode.has(s);
  };

  /* ===== paste from Excel =====
     One lookup bundle shared by the fill-down paste on the code cell and by the
     import modal, so a pasted line resolves exactly like a typed one. */
  const byName = useMemo(() => {
    const m = new Map();
    for (const it of allItems) {
      const k = normalizeCode(it.description);
      if (k && !m.has(k)) m.set(k, it);
    }
    return m;
  }, [allItems]);

  const catalogLookup = useMemo(
    () => ({
      isKnownCode: (v) => byCode.has(normalizeCode(v)),
      lookupCode: (v) => byCode.get(normalizeCode(v)) || null,
      lookupName: (v) => byName.get(normalizeCode(v)) || null,
    }),
    [byCode, byName]
  );

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const openPaste = (text = "") => {
    setPasteText(text);
    setPasteOpen(true);
  };

  /** Write a list of codes down the table from `startIdx`, growing it as needed. */
  const fillCodesDown = (startIdx, codes) => {
    setRows((prev) => {
      const next = [...prev];
      codes.forEach((code, k) => {
        const at = startIdx + k;
        const base = next[at] || blankItem();
        next[at] = {
          ...base,
          itemCode: code,
          ...catalogPatch(byCode.get(normalizeCode(code))),
        };
      });
      return next;
    });
    const unknown = codes.filter((c) => !isKnownCode(c)).length;
    flash(
      unknown
        ? `${codes.length} codes pasted — ${unknown} not in the catalog.`
        : `${codes.length} codes pasted.`,
      3500
    );
  };

  /** Write pasted lines over the rows from `startIdx`, leaving every field the
      block did not mention (photos, reasons, a unit already chosen) alone. */
  const mergeRowsDown = (startIdx, built) => {
    setRows((prev) => {
      const next = [...prev];
      built.forEach((b, k) => {
        const at = startIdx + k;
        next[at] = { ...(next[at] || blankItem()), ...b.patch };
      });
      return next;
    });
  };

  /* A code cell accepts a whole Excel column: one value per line fills the rows
     below, a block with several columns hands over to the mapping modal. */
  const handleCodePaste = (idx, e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (!/[\t\n\r]/.test(text.trim())) return; // one value — let the browser paste it
    e.preventDefault();
    const input = e.target;
    const matrix = parseClipboard(text);
    if (!matrix.length) return;

    if (matrixIsSingleColumn(matrix)) {
      const codes = firstColumn(matrix);
      /* a copied column often carries its Excel title in the first cell */
      if (codes.length > 1 && looksLikeHeader([codes[0]], isKnownCode)) codes.shift();
      if (codes.length) {
        fillCodesDown(idx, codes);
        input.blur?.(); // the suggestion list still hangs on the old value
      }
      return;
    }

    const headerRow = looksLikeHeader(matrix[0], isKnownCode);
    const mapping = guessMapping(matrix, { headerRow, isKnownCode });
    const narrow =
      matrix[0].length <= 3 &&
      mapping.includes("itemCode") &&
      mapping.every((f) => DIRECT_FIELDS.has(f));

    if (narrow) {
      const built = buildRows(headerRow ? matrix.slice(1) : matrix, mapping, catalogLookup);
      if (built.length) {
        mergeRowsDown(idx, built);
        input.blur?.();
        const unknown = built.filter((b) => b.hasCode && !b.matched).length;
        const withQty = mapping.includes("quantity") ? " with quantities" : "";
        flash(
          unknown
            ? `${built.length} rows pasted${withQty} — ${unknown} not in the catalog.`
            : `${built.length} rows pasted${withQty}.`,
          3500
        );
      }
      return;
    }

    openPaste(text);
  };

  const applyPastedRows = (built, mode) => {
    setRows((prev) => {
      if (mode === "replace") return built.length ? built : [blankItem()];
      const kept = prev.filter(rowHasData);
      return [...kept, ...built];
    });
    setRowErrors({});
    setPasteOpen(false);
    flash(
      mode === "replace"
        ? `Table replaced with ${built.length} rows.`
        : `${built.length} rows added.`,
      3000
    );
  };

  /* ===== row editing ===== */
  const setHeaderField = (field, value) =>
    setHeader((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "branch" && value !== OTHER_BRANCH) next.customBranch = "";
      if (field === "method" && value !== OTHER) next.customMethod = "";
      return next;
    });

  const handleChange = (idx, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[idx], [field]: value };

      if (field === "qtyType" && value !== OTHER) cur.customQtyType = "";
      if (field === "method" && value !== OTHER) cur.customMethod = "";

      /* Catalog auto-fill: the item code is the only thing that writes the
         product name — the name cell is read-only, so a code with no catalog
         match clears it instead of leaving the previous product behind. */
      if (field === "itemCode") {
        Object.assign(cur, catalogPatch(byCode.get(normalizeCode(value))));
      }

      next[idx] = cur;
      return next;
    });
  };

  /* ===== reasons — one line may carry more than one =====
     The raw array is the editing state (it may hold one still-empty free-text
     slot); `itemReasons` is only the bridge for rows saved before this field
     existed. Empty slots are dropped by prepareItem on save. */
  const rowReasons = (row) => (Array.isArray(row?.reasons) ? row.reasons : itemReasons(row));

  const setReasons = (idx, next) =>
    setRows((prev) => {
      const list = [...prev];
      list[idx] = { ...list[idx], reasons: next };
      return list;
    });

  const addReason = (idx, value) => {
    const v = String(value || "").trim();
    if (!v) return;
    const cur = rowReasons(rows[idx]);
    if (v === OTHER) {
      /* "Other..." adds one empty free-text slot to fill in */
      if (cur.some(isCustomReason) || cur.includes("")) return;
      setReasons(idx, [...cur, ""]);
      return;
    }
    if (cur.includes(v)) return;
    setReasons(idx, [...cur, v]);
  };

  const removeReason = (idx, at) => {
    const cur = rowReasons(rows[idx]).slice();
    cur.splice(at, 1);
    setReasons(idx, cur);
  };

  const editCustomReason = (idx, at, value) => {
    const cur = rowReasons(rows[idx]).slice();
    cur[at] = value;
    setReasons(idx, cur);
  };

  const addRow = () => setRows((prev) => [...prev, blankItem()]);

  const duplicateRow = (idx) =>
    setRows((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, { ...next[idx], images: [] });
      return next;
    });

  const removeRow = (idx) =>
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [blankItem()];
    });

  /* ===== images =====
     Two targets share one modal: a single item line, or the record as a whole
     (header.images — general photos of the destruction event, no maximum). */
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState("row"); // "row" | "report"
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  const openRowImages = (idx) => {
    setImageTarget("row");
    setImageRowIndex(idx);
    setImageModalOpen(true);
  };

  const openReportImages = () => {
    setImageTarget("report");
    setImageModalOpen(true);
  };

  const addImagesToReport = (urls) => {
    setHeader((prev) => ({ ...prev, images: [...safeArr(prev.images), ...urls] }));
    flash("Photos added to the report.", 1500);
  };

  const removeImageFromReport = async (imgIndex) => {
    const url = safeArr(header.images)[imgIndex];
    setHeader((prev) => {
      const next = safeArr(prev.images).slice();
      next.splice(imgIndex, 1);
      return { ...prev, images: next };
    });
    await deleteImage(url);
    flash("Photo removed.", 1500);
  };

  const addImagesToRow = (urls) => {
    if (imageRowIndex < 0) return;
    setRows((prev) =>
      prev.map((r, i) =>
        i === imageRowIndex ? { ...r, images: [...safeArr(r.images), ...urls] } : r
      )
    );
    flash("Photos added.", 1500);
  };

  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;
    const url = rows?.[imageRowIndex]?.images?.[imgIndex];
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== imageRowIndex) return r;
        const next = safeArr(r.images).slice();
        next.splice(imgIndex, 1);
        return { ...r, images: next };
      })
    );
    await deleteImage(url);
    flash("Photo removed.", 1500);
  };

  /* ===== totals ===== */
  const filledRows = useMemo(() => rows.filter(rowHasData), [rows]);
  const totals = useMemo(() => computeTotals(filledRows), [filledRows]);

  /* ===== validation ===== */
  const validate = (items) => {
    const hErr = {};
    if (!String(header.branch || "").trim()) hErr.branch = true;
    if (header.branch === OTHER_BRANCH && !String(header.customBranch || "").trim())
      hErr.customBranch = true;
    if (!String(header.destructionDate || "").trim()) hErr.destructionDate = true;
    if (!String(header.performedBy || "").trim()) hErr.performedBy = true;
    if (!String(header.approvedBy || "").trim()) hErr.approvedBy = true;

    const rErr = {};
    items.forEach((r, idx) => {
      const bad =
        !String(r.productName || "").trim() ||
        !(Number(r.quantity) > 0) ||
        (r.qtyType === OTHER && !String(r.customQtyType || "").trim()) ||
        !itemReasons(r).length ||
        (r.method === OTHER && !String(r.customMethod || "").trim());
      if (bad) rErr[idx] = true;
    });

    const ok = !Object.keys(hErr).length && !Object.keys(rErr).length;
    return {
      ok,
      hErr,
      rErr,
      msg: ok
        ? ""
        : "Please complete the highlighted fields: Branch, Destruction Date, Destroyed By, Approved By, and for every line a catalog Item Code (it fills the product), Quantity (> 0) and at least one Reason.",
    };
  };

  /* ===== save ===== */
  const handleSave = async () => {
    if (saving) return;

    setRowErrors({});
    setHeaderErrors({});

    const items = rows.filter(rowHasData).map(prepareItem);
    if (!items.length) {
      flash("Nothing to save — add at least one destroyed item.");
      return;
    }

    const v = validate(items);
    if (!v.ok) {
      setRowErrors(v.rErr);
      setHeaderErrors(v.hErr);
      flash(v.msg, 5000);
      return;
    }

    const payload = {
      reportDate,
      header: {
        ...header,
        branch: String(header.branch || "").trim(),
        customBranch: String(header.customBranch || "").trim(),
      },
      items,
      totals: {
        lines: items.length,
        totalValue: computeTotals(items).totalValue,
        totalWeight: computeTotals(items).totalWeight,
      },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setSaveMsg("Checking report date...");
      const existing = await findReportForDate(reportDate);

      if (existing) {
        const id = getId(existing);
        const oldItems = safeArr(existing?.payload?.items);
        const append = window.confirm(
          `A destruction record already exists for ${reportDate} (${oldItems.length} line(s)).\n\n` +
            `OK  = append these ${items.length} line(s) to it.\n` +
            `Cancel = stop and change the date.`
        );
        if (!append) {
          setSaving(false);
          flash("Save cancelled — pick another date.", 3500);
          return;
        }
        if (!id) throw new Error("Existing report has no id.");

        setSaveMsg("Appending to the existing record...");
        const merged = [...oldItems, ...items];
        await updateReportById(id, {
          ...(existing.payload || {}),
          reportDate,
          header: {
            ...(existing?.payload?.header || payload.header),
            images: [
              ...safeArr(existing?.payload?.header?.images),
              ...safeArr(header.images),
            ],
          },
          items: merged,
          totals: {
            lines: merged.length,
            totalValue: computeTotals(merged).totalValue,
            totalWeight: computeTotals(merged).totalWeight,
          },
          savedAt: Date.now(),
        });
        flash(`Appended. The record for ${reportDate} now has ${merged.length} line(s).`, 5000);
      } else {
        setSaveMsg("Saving to server...");
        const res = await createReport(payload);
        /* The server allocates the reference number and returns the stored row. */
        const refNo = res?.report?.payload?.refNo || res?.payload?.refNo;
        flash(
          refNo
            ? `Saved successfully. Reference: ${refNo}`
            : `Saved successfully. Ref: ${res?.report?.id || res?.id || "—"}`,
          6000
        );
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      /* A filed event takes its photos and its note with it. They used to be
         left in the form, so the next record opened carrying the previous
         day's pictures and re-attached them on save — and removing the draft
         key above never helped, because the autosave rewrites it from state a
         moment later. The site, the method and the names DO stay: they are
         the same every time and re-typing them is the whole point of a draft. */
      setHeader((h) => ({ ...h, images: [], notes: "", municipalityRef: "" }));
      setRows([blankItem()]);
    } catch (err) {
      console.error(err);
      flash("Save failed. Please try again.", 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ===== render helpers ===== */
  const inp = (idx) =>
    rowErrors?.[idx] ? { ...input, border: "2px solid #ef4444", background: "#fff1f2" } : input;

  const hInp = (field) =>
    headerErrors?.[field]
      ? { ...input, border: "2px solid #ef4444", background: "#fff1f2" }
      : input;

  return (
    <div style={pageWrap}>
      <h2 style={pageTitle}>🗑️ Condemnation &amp; Disposal Record — سجل الإعدام والتخلص</h2>

      <div style={topBar}>
        <div style={datePill}>
          <span style={{ fontWeight: 900 }}>Report Date</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={dateInput}
          />
        </div>

        <div style={topButtons}>
          <button onClick={handleSave} disabled={saving} style={saving ? btnSaveDisabled : btnSave}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button onClick={() => openPaste("")} style={btnPaste}>
            📋 Paste from Excel
          </button>
          <button onClick={() => navigate("/destruction/browse")} style={btnView}>
            📋 View Records
          </button>
          <button onClick={clearDraft} style={btnDark}>
            Clear Draft
          </button>
          <button onClick={() => navigate("/returns/menu")} style={btnGhost}>
            ⬅ Back
          </button>
        </div>
      </div>

      {saveMsg && <div style={msgBox}>{saveMsg}</div>}

      {/* ───────── Header / disposal certificate details ───────── */}
      <div style={card}>
        <div style={cardHead}>📄 Condemnation &amp; Disposal Details — بيانات الإعدام والتخلص</div>
        <div style={headerGrid}>
          <label style={fieldLbl}>
            <span>Branch / Location *</span>
            <select
              style={hInp("branch")}
              value={header.branch}
              onChange={(e) => setHeaderField("branch", e.target.value)}
            >
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {header.branch === OTHER_BRANCH && (
              <input
                style={{ ...hInp("customBranch"), marginTop: 8 }}
                placeholder="Enter branch name"
                value={header.customBranch}
                onChange={(e) => setHeaderField("customBranch", e.target.value)}
              />
            )}
          </label>

          <label style={fieldLbl}>
            <span>Disposal Date *</span>
            <input
              type="date"
              style={hInp("destructionDate")}
              value={header.destructionDate}
              onChange={(e) => setHeaderField("destructionDate", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Disposal Site</span>
            <input
              style={input}
              placeholder="e.g. Al Qusais Municipality Landfill"
              value={header.location}
              onChange={(e) => setHeaderField("location", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Default Method</span>
            <select
              style={input}
              value={header.method}
              onChange={(e) => setHeaderField("method", e.target.value)}
            >
              <option value="">Select method</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {header.method === OTHER && (
              <input
                style={{ ...input, marginTop: 8 }}
                placeholder="Enter method"
                value={header.customMethod}
                onChange={(e) => setHeaderField("customMethod", e.target.value)}
              />
            )}
          </label>

          <label style={fieldLbl}>
            <span>Disposal Company / Contractor</span>
            <input
              style={input}
              placeholder="Approved waste contractor"
              value={header.disposalCompany}
              onChange={(e) => setHeaderField("disposalCompany", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Municipality / Receipt Ref.</span>
            <input
              style={input}
              placeholder="Certificate or receipt number"
              value={header.municipalityRef}
              onChange={(e) => setHeaderField("municipalityRef", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Destroyed By *</span>
            <input
              style={hInp("performedBy")}
              placeholder="Name / designation"
              value={header.performedBy}
              onChange={(e) => setHeaderField("performedBy", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Witnessed By</span>
            <input
              style={input}
              placeholder="Name / designation"
              value={header.witnessedBy}
              onChange={(e) => setHeaderField("witnessedBy", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Approved By (QA) *</span>
            <input
              style={hInp("approvedBy")}
              placeholder="Name / designation"
              value={header.approvedBy}
              onChange={(e) => setHeaderField("approvedBy", e.target.value)}
            />
          </label>

          <div style={{ ...fieldLbl, gridColumn: "1 / -1" }}>
            <span>Report Photos — صور عامة للتقرير</span>
            <div style={reportPhotosBar}>
              <button type="button" onClick={openReportImages} style={btnBlue}>
                📷 Upload report photos
              </button>
              <span style={reportPhotosCount}>
                {safeArr(header.images).length} photo(s) — no limit
              </span>
              {safeArr(header.images).length > 0 && (
                /* Photos are the one part of a carried-over draft that is
                   never right twice, so dropping the whole strip is one
                   click. The pictures stay on Cloudinary and on whatever
                   record already holds them — this only detaches them here. */
                <button
                  type="button"
                  style={clearPhotosBtn}
                  title="Remove every photo from this form (already-saved records keep theirs)"
                  onClick={() => {
                    if (window.confirm(`Remove all ${safeArr(header.images).length} photo(s) from this form?`)) {
                      setHeader((h) => ({ ...h, images: [] }));
                    }
                  }}
                >
                  ✖ Clear photos
                </button>
              )}
              <div style={reportPhotosStrip}>
                {safeArr(header.images).slice(0, 12).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`report-${i}`}
                    style={reportPhotoThumb}
                    onClick={openReportImages}
                    title="Open the photo manager"
                  />
                ))}
                {safeArr(header.images).length > 12 && (
                  <span style={reportPhotosCount}>
                    +{safeArr(header.images).length - 12}
                  </span>
                )}
              </div>
            </div>
          </div>

          <label style={{ ...fieldLbl, gridColumn: "1 / -1" }}>
            <span>General Notes</span>
            <input
              style={input}
              placeholder="Any additional note about this destruction event"
              value={header.notes}
              onChange={(e) => setHeaderField("notes", e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* ───────── Items ───────── */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 52 }}>SL</th>
              <th style={{ ...th, width: 138 }}>ITEM CODE</th>
              <th style={{ ...th, width: 230 }}>PRODUCT *</th>
              <th style={{ ...th, width: 110 }}>BATCH / LOT</th>
              <th style={{ ...th, width: 130 }}>PROD. DATE</th>
              <th style={{ ...th, width: 130 }}>EXPIRY</th>
              <th style={{ ...th, width: 92 }}>QTY *</th>
              <th style={{ ...th, width: 96 }}>UNIT</th>
              <th style={{ ...th, width: 100 }}>UNIT COST</th>
              <th style={{ ...th, width: 104 }}>VALUE (AED)</th>
              <th style={{ ...th, width: 210 }}>REASON(S) *</th>
              <th style={{ ...th, width: 170 }}>METHOD</th>
              <th style={th}>REMARKS</th>
              <th style={{ ...th, width: 110 }}>PHOTOS</th>
              <th style={{ ...th, width: 92 }}>ROW</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fdf7f7" : "#fff" }}>
                <td style={td}>
                  <div style={slPill}>{idx + 1}</div>
                </td>

                {/* ITEM CODE — the suggestion list lives in a portal, see CodeSuggest */}
                <td style={td}>
                  <CodeSuggest
                    value={row.itemCode || ""}
                    onChange={(v) => handleChange(idx, "itemCode", v)}
                    onPick={(item) => pickItem(idx, item)}
                    search={localSearch}
                    style={inp(idx)}
                    placeholder="Code or name"
                    inputProps={{
                      "data-col": "itemCode",
                      onPaste: (e) => handleCodePaste(idx, e),
                      title: "Paste a whole column of codes from Excel here",
                    }}
                  />
                  {row.itemCode && !isKnownCode(row.itemCode) && (
                    <div style={codeMissNote}>Code not in the catalog</div>
                  )}
                </td>

                <td style={td}>
                  <input
                    style={{ ...inp(idx), ...lockedInput }}
                    readOnly
                    tabIndex={-1}
                    placeholder="From item code"
                    title="Filled from the item code"
                    value={row.productName}
                  />
                </td>

                <td style={td}>
                  <input
                    style={input}
                    placeholder="Batch"
                    value={row.batchNo}
                    onChange={(e) => handleChange(idx, "batchNo", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    type="date"
                    style={input}
                    value={row.productionDate}
                    onChange={(e) => handleChange(idx, "productionDate", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    type="date"
                    style={input}
                    value={row.expiry}
                    onChange={(e) => handleChange(idx, "expiry", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={inp(idx)}
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <select
                    style={inp(idx)}
                    value={row.qtyType}
                    onChange={(e) => handleChange(idx, "qtyType", e.target.value)}
                  >
                    {QTY_TYPES.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  {row.qtyType === OTHER && (
                    <input
                      style={{ ...inp(idx), marginTop: 8 }}
                      placeholder="Unit"
                      value={row.customQtyType}
                      onChange={(e) => handleChange(idx, "customQtyType", e.target.value)}
                    />
                  )}
                </td>

                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={input}
                    placeholder="0.00"
                    value={row.unitCost}
                    onChange={(e) => handleChange(idx, "unitCost", e.target.value)}
                  />
                </td>

                <td style={{ ...td, fontWeight: 900, color: "#7f1d1d" }}>
                  {fmt2(lineValue(row))}
                </td>

                <td style={{ ...td, textAlign: "left" }}>
                  {(() => {
                    const picked = rowReasons(row);
                    const taken = new Set(picked);
                    const hasCustom = picked.some((r) => r === "" || isCustomReason(r));
                    return (
                      <>
                        {picked.length > 0 && (
                          <div style={reasonChips}>
                            {picked.map((r, ri) =>
                              r === "" || isCustomReason(r) ? (
                                <div key={`c-${ri}`} style={reasonCustomWrap}>
                                  <input
                                    autoFocus={r === ""}
                                    style={reasonCustomInput}
                                    placeholder="Enter reason"
                                    value={r}
                                    onChange={(e) => editCustomReason(idx, ri, e.target.value)}
                                  />
                                  <button
                                    onClick={() => removeReason(idx, ri)}
                                    style={reasonChipX}
                                    title="Remove this reason"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span key={`r-${ri}`} style={reasonChip}>
                                  <span style={{ lineHeight: 1.25 }}>{r}</span>
                                  <button
                                    onClick={() => removeReason(idx, ri)}
                                    style={reasonChipX}
                                    title="Remove this reason"
                                  >
                                    ✕
                                  </button>
                                </span>
                              )
                            )}
                          </div>
                        )}
                        <select
                          style={{ ...inp(idx), marginTop: picked.length ? 8 : 0 }}
                          value=""
                          onChange={(e) => {
                            addReason(idx, e.target.value);
                            e.target.value = "";
                          }}
                        >
                          <option value="">
                            {picked.length ? "+ Add another reason" : "Select reason"}
                          </option>
                          {REASONS.filter(
                            (r) => (r === OTHER ? !hasCustom : !taken.has(r))
                          ).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </>
                    );
                  })()}
                </td>

                <td style={td}>
                  <select
                    style={inp(idx)}
                    value={row.method}
                    onChange={(e) => handleChange(idx, "method", e.target.value)}
                  >
                    <option value="">Use default</option>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {row.method === OTHER && (
                    <input
                      style={{ ...inp(idx), marginTop: 8 }}
                      placeholder="Enter method"
                      value={row.customMethod}
                      onChange={(e) => handleChange(idx, "customMethod", e.target.value)}
                    />
                  )}
                </td>

                <td style={td}>
                  <input
                    style={input}
                    placeholder="Remarks"
                    value={row.remarks}
                    onChange={(e) => handleChange(idx, "remarks", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <button
                    onClick={() => openRowImages(idx)}
                    style={btnImg}
                    title="Manage evidence photos"
                  >
                    📷 {safeArr(row.images).length}
                  </button>
                </td>

                <td style={td}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button onClick={() => duplicateRow(idx)} style={btnMini} title="Duplicate row">
                      ⧉
                    </button>
                    <button
                      onClick={() => removeRow(idx)}
                      style={btnMiniDel}
                      title="Delete row"
                    >
                      ✖
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ───────── Totals ───────── */}
      <div style={totalsBar}>
        <div style={totalChip}>
          <span style={totalLbl}>Lines</span>
          <span style={totalVal}>{totals.lines}</span>
        </div>
        <div style={totalChip}>
          <span style={totalLbl}>Total Weight (KG)</span>
          <span style={totalVal}>{fmt2(totals.totalWeight)}</span>
        </div>
        <div style={totalChip}>
          <span style={totalLbl}>Estimated Value (AED)</span>
          <span style={totalVal}>{fmt2(totals.totalValue)}</span>
        </div>
        {totals.byUnit.map(([unit, qty]) => (
          <div key={unit} style={totalChipGhost}>
            <span style={totalLbl}>{unit}</span>
            <span style={totalVal}>{fmt2(qty)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, textAlign: "center", display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={addRow} style={btnAdd}>
          ➕ Add Item
        </button>
        <button onClick={() => openPaste("")} style={btnPasteWide}>
          📋 Paste rows from Excel
        </button>
      </div>

      <ExcelPasteModal
        open={pasteOpen}
        initialText={pasteText}
        catalog={catalogLookup}
        onClose={() => setPasteOpen(false)}
        onApply={applyPastedRows}
      />

      <ImageManagerModal
        open={imageModalOpen && (imageTarget === "report" || imageRowIndex >= 0)}
        title={
          imageTarget === "report"
            ? "📷 Report Photos — صور عامة للتقرير"
            : `📷 Destruction Evidence${
                rows?.[imageRowIndex]?.productName
                  ? ` — ${rows[imageRowIndex].productName}`
                  : ""
              }`
        }
        hint={
          imageTarget === "report"
            ? "General photos of the whole destruction event — as many as you need."
            : "Attach before / after destruction photos as evidence."
        }
        images={imageTarget === "report" ? header.images : rows?.[imageRowIndex]?.images}
        onClose={() => setImageModalOpen(false)}
        onAddImages={imageTarget === "report" ? addImagesToReport : addImagesToRow}
        onRemoveImage={imageTarget === "report" ? removeImageFromReport : removeImageFromRow}
      />
    </div>
  );
}

/* ====================== STYLES ====================== */
const pageWrap = {
  fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  padding: 16,
  background: "#faf6f6",
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
};

const pageTitle = {
  textAlign: "center",
  color: "#7f1d1d",
  margin: "10px 0 16px",
  fontWeight: 900,
  letterSpacing: 0.2,
};

const topBar = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const datePill = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#b91c1c",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  boxShadow: "0 2px 10px rgba(185,28,28,.2)",
};

const dateInput = {
  background: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 800,
  color: "#111827",
};

const topButtons = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
};

const msgBox = {
  fontWeight: 800,
  color: "#111827",
  background: "#fff",
  border: "1px solid #e5e7eb",
  padding: "10px 12px",
  borderRadius: 12,
  marginBottom: 12,
};

const card = {
  background: "#fff",
  border: "1px solid #f0d6d6",
  borderRadius: 14,
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
  overflow: "hidden",
  marginBottom: 14,
};

const cardHead = {
  background: "#fdeaea",
  borderBottom: "2px solid #f3c0c0",
  color: "#7f1d1d",
  fontWeight: 900,
  padding: "12px 14px",
};

const headerGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  padding: 14,
};

const fieldLbl = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 900,
  fontSize: 13,
  color: "#334155",
};

const tableWrap = { width: "100%", overflowX: "auto" };

const table = {
  width: "100%",
  minWidth: 1500,
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 2px 16px rgba(0,0,0,.08)",
};

const th = {
  padding: "12px 8px",
  textAlign: "center",
  fontSize: 12.5,
  fontWeight: 900,
  color: "#7f1d1d",
  background: "#fdeaea",
  borderBottom: "2px solid #f3c0c0",
  wordBreak: "break-word",
};

const td = {
  padding: "10px 8px",
  textAlign: "center",
  verticalAlign: "middle",
  wordBreak: "break-word",
  borderLeft: "1px solid #f5eaea",
  borderRight: "1px solid #f5eaea",
  borderBottom: "1px solid #f5eaea",
};

const slPill = {
  display: "inline-grid",
  placeItems: "center",
  width: 30,
  height: 30,
  borderRadius: 999,
  background: "#7f1d1d",
  color: "#fff",
  fontWeight: 900,
  fontSize: 13,
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  borderRadius: 10,
  border: "1.5px solid #e5b8b8",
  background: "#fffafa",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
};

const codeMissNote = {
  marginTop: 5,
  fontSize: 11,
  fontWeight: 800,
  color: "#b45309",
  lineHeight: 1.25,
};

const reportPhotosBar = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const clearPhotosBtn = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: 10,
  padding: "6px 12px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const reportPhotosCount = {
  fontSize: 12.5,
  fontWeight: 800,
  color: "#7f1d1d",
};

const reportPhotosStrip = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const reportPhotoThumb = {
  width: 44,
  height: 44,
  objectFit: "cover",
  borderRadius: 8,
  border: "1.5px solid #e5b8b8",
  cursor: "pointer",
};

/* Read-only cells (the product name) — clearly not typeable. */
const lockedInput = {
  background: "#f6f1f1",
  color: "#4b5563",
  cursor: "default",
};

const totalsBar = {
  marginTop: 14,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const totalChip = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 160,
  background: "#7f1d1d",
  color: "#fff",
  borderRadius: 12,
  padding: "10px 14px",
  boxShadow: "0 2px 10px rgba(127,29,29,.22)",
};

const totalChipGhost = {
  ...totalChip,
  background: "#fff",
  color: "#7f1d1d",
  border: "1px solid #f0d6d6",
  boxShadow: "0 2px 10px rgba(0,0,0,.05)",
  minWidth: 110,
};

const totalLbl = { fontSize: 12, fontWeight: 800, opacity: 0.9 };
const totalVal = { fontSize: 18, fontWeight: 900 };

/* buttons */
const btnBase = {
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 14px",
  cursor: "pointer",
  color: "#fff",
  fontFamily: "inherit",
};

const btnSave = { ...btnBase, background: "#229954", boxShadow: "0 2px 8px rgba(34,153,84,.2)" };
const btnSaveDisabled = { ...btnSave, background: "#7fbf9f", cursor: "not-allowed" };
const btnView = { ...btnBase, background: "#b91c1c", boxShadow: "0 2px 8px rgba(185,28,28,.2)" };
const btnDark = { ...btnBase, background: "#0f172a" };
const btnBlue = { ...btnBase, background: "#2563eb" };

const btnGhost = {
  ...btnBase,
  background: "transparent",
  color: "#7f1d1d",
  border: "1px solid rgba(127,29,29,.45)",
};

const btnPaste = { ...btnBase, background: "#7c3aed", boxShadow: "0 2px 8px rgba(124,58,237,.22)" };
const btnPasteWide = { ...btnPaste, padding: "12px 22px", fontSize: "1rem" };
const btnReplace = { ...btnBase, background: "#b45309" };

/* ── Excel paste modal ── */
const pasteCard = {
  width: "min(1200px, 97vw)",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
  fontFamily: "Cairo, system-ui, sans-serif",
};

const pasteHint = { fontSize: 13, color: "#475569", fontWeight: 700, lineHeight: 1.5 };

const pasteArea = {
  width: "100%",
  minHeight: 110,
  boxSizing: "border-box",
  border: "2px dashed #c4b5fd",
  borderRadius: 12,
  padding: 10,
  fontFamily: "Consolas, Menlo, monospace",
  fontSize: 13,
  color: "#0f172a",
  background: "#faf5ff",
  resize: "vertical",
};

const pasteBar = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  fontSize: 12.5,
  fontWeight: 800,
};

const pasteCheck = { display: "flex", alignItems: "center", gap: 6, color: "#334155", cursor: "pointer" };
const pasteCount = { background: "#eef2ff", color: "#3730a3", borderRadius: 999, padding: "3px 10px" };
const pasteOk = { background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "3px 10px" };
const pasteWarn = { background: "#fef3c7", color: "#92400e", borderRadius: 999, padding: "3px 10px" };

const pastePreviewWrap = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const pastePreview = { width: "100%", borderCollapse: "collapse" };

const pasteTh = {
  position: "sticky",
  top: 0,
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  padding: 6,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const pasteTd = {
  borderBottom: "1px solid #f1f5f9",
  padding: "5px 6px",
  whiteSpace: "nowrap",
  maxWidth: 240,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const pasteSelect = {
  border: "1px solid #ddd6fe",
  borderRadius: 8,
  padding: "3px 6px",
  fontWeight: 800,
  color: "#5b21b6",
  background: "#fff",
  fontFamily: "inherit",
};

const pasteHeadCell = { marginTop: 3, fontSize: 11, color: "#94a3b8", fontWeight: 700 };
const pasteOkCell = { color: "#166534", fontWeight: 700 };
const pasteWarnCell = { color: "#b45309", fontWeight: 700 };
const pasteMore = { padding: 8, fontSize: 12, color: "#64748b", fontWeight: 700 };

const pasteActions = { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" };

const reasonChips = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const reasonChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  maxWidth: "100%",
  padding: "5px 6px 5px 9px",
  borderRadius: 999,
  background: "#fdeaea",
  border: "1.5px solid #e5b8b8",
  color: "#7f1d1d",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "left",
};

const reasonChipX = {
  border: "none",
  background: "#7f1d1d",
  color: "#fff",
  width: 18,
  height: 18,
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};

const reasonCustomWrap = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const reasonCustomInput = {
  flex: 1,
  minWidth: 0,
  boxSizing: "border-box",
  padding: "7px 9px",
  borderRadius: 10,
  border: "1.5px solid #e5b8b8",
  background: "#fffafa",
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "inherit",
};

const btnImg = {
  ...btnBase,
  width: "100%",
  background: "#2563eb",
  padding: "9px 8px",
  fontSize: 13,
};

const btnMini = {
  ...btnBase,
  background: "#475569",
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 13,
};

const btnMiniDel = { ...btnMini, background: "#c0392b" };

const btnAdd = {
  ...btnBase,
  background: "#7f1d1d",
  borderRadius: 14,
  fontSize: 14,
  padding: "12px 20px",
  boxShadow: "0 2px 8px rgba(127,29,29,.2)",
};

/* gallery modal */
const galleryBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const galleryCard = {
  width: "min(1100px, 96vw)",
  maxHeight: "84vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
  fontFamily: "Cairo, system-ui, sans-serif",
};

const galleryTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const galleryTitle = { fontWeight: 900, fontSize: "1.05rem", color: "#7f1d1d" };

const galleryClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};

const galleryActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 10,
  marginBottom: 8,
  flexWrap: "wrap",
};

const previewImg = {
  maxWidth: "100%",
  maxHeight: "62vh",
  borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,.2)",
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

const thumbImg = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  display: "block",
  cursor: "zoom-in",
};

const thumbRemove = {
  position: "absolute",
  top: 6,
  right: 6,
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "2px 8px",
  fontWeight: 900,
  cursor: "pointer",
};
