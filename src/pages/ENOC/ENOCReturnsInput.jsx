// D:\inspection-react-full\src\pages\ENOC\ENOCReturnsInput.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ========= API BASE ========= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
let fromVite;
try {
  fromVite =
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL);
} catch {
  fromVite = undefined;
}
const fromCRA = process.env?.REACT_APP_API_URL;
export const API_BASE = String(fromVite || fromCRA || API_ROOT_DEFAULT).replace(
  /\/$/,
  ""
);

/* ========= ENOC BOX CATALOG ========= */
const BOX_CATALOG = {
  "99509": {
    name: "RED SHISH TAWOOK [480GRMS] BRAAI KIT - BOX",
    items: [
      { code: "97101", name: "FATTOUSH SALAD -  PLATE" },
      { code: "97102", name: "HUMMUS - PLATE" },
      { code: "99458", name: "GARLIC PASTE (35G) - PIECES" },
      { code: "96180", name: "ARABIC BREAD SMALL- PIECE" },
      { code: "71020", name: "SHISH TAWOOK RED FTR - BOX" },
    ],
  },
  "99511": {
    name: "LAMB KUFTA KABAB [480GRMS] BRAAI KIT - BOX",
    items: [
      { code: "71001", name: "LAMB KABAB FTR - BOX" },
      { code: "97103", name: "TABBOULEH SALAD - PLATE" },
      { code: "97102", name: "HUMMUS - PLATE" },
      { code: "71076", name: "GRILLED VEGETABLE FTR - PLATE" },
      { code: "96180", name: "ARABIC BREAD SMALL- PIECE" },
    ],
  },
  "99512": {
    name: "LAMB TIKKA [440GRMS] BRAAI KIT - BOX",
    items: [
      { code: "71004", name: "LAMB TIKKA EXTRA FTR - BOX" },
      { code: "97101", name: "FATTOUSH SALAD -  PLATE" },
      { code: "97102", name: "HUMMUS - PLATE" },
      { code: "71076", name: "GRILLED VEGETABLE FTR - PLATE" },
      { code: "96180", name: "ARABIC BREAD SMALL- PIECE" },
    ],
  },
  "20062": {
    name: "BRZ BURGER BOX OF 6",
    items: [
      { code: "20075", name: "BRAZILIAN BEEF STRIPLOIN - KG" },
      { code: "96110", name: "CUCUMBER PICKLES - KG" },
      { code: "96030", name: "YELLOW SLICED CHEESE - KG" },
      { code: "96051", name: "MAYONNAISE - KG" },
      { code: "96050", name: "MUSTARD - KG" },
      { code: "96202", name: "WHITE ONION - KG" },
      { code: "96229", name: "TOMATO - KG" },
      { code: "96239", name: "LETTUCE ROMAINE - KG" },
      { code: "61120", name: "Black Cutlery Set" },
      { code: "96275", name: "BURGER BUN - PC" },
    ],
  },
};

/* ========= ENOC SITES ========= */
const ENOC_SITES = [
  { code: "1023", name: "Yalayis 3 Al Qudra", van: "VF 02" },
  { code: "1072", name: "Al Barsha South", van: "VF 02" },
  { code: "1033", name: "Hessa Street", van: "VF 02" },
  { code: "1097", name: "Dubai Academic City", van: "VF 06" },
  { code: "1071", name: "Dubai Alain Rd, After outlet mall", van: "VF 07" },
  { code: "1084", name: "Expo Road", van: "VF 07" },
  { code: "1052", name: "Sheikh Mohammed Bin Zayed Rd", van: "VF 07" },
  { code: "1064", name: "Warsan 3", van: "VF 29" },
  { code: "1063", name: "Al Awir Rd", van: "VF 29" },
  { code: "1143", name: "Al Badayer, Madam Area, Hatta", van: "VF 29" },
];

const OTHER_SITE = "Other site...";
const BRANCHES = [
  ...ENOC_SITES.map((s) => `${s.code} - ${s.name} (${s.van})`),
  OTHER_SITE,
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

const QTY_TYPES = ["KG", "PCS", "Other"];
const ENOC_RETURNS_CREATE_PASSWORD = "9999";

/* ========= Draft ========= */
const DRAFT_KEY = "enoc_returns_draft_v1";

/* ========= Helpers ========= */
function getToday() {
  return new Date().toISOString().slice(0, 10);
}
const onlyDigits5 = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 5);
const onlyDigits10 = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 10);

function guessQtyTypeFromName(name) {
  const s = String(name || "").toUpperCase();
  if (s.includes(" - KG") || s.endsWith(" KG") || s.includes("KG")) return "KG";
  if (s.includes(" - PC") || s.includes("PCS") || s.includes("PIECE")) return "PCS";
  return "PCS";
}

function makeGroupId() {
  return `gid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* ========= Grouping by boxGroupId (prevents mixing same box code) ========= */
function computeBoxGroups(rows) {
  const meta = Array(rows.length)
    .fill(null)
    .map(() => ({
      span: 1,
      isStart: true,
      isEnd: true,
      groupNo: 0,
      groupId: "",
    }));

  let groupNo = 0;
  let i = 0;

  while (i < rows.length) {
    const gid = String(rows?.[i]?.boxGroupId || "").trim();

    if (!gid) {
      groupNo += 1;
      meta[i] = { span: 1, isStart: true, isEnd: true, groupNo, groupId: "" };
      i += 1;
      continue;
    }

    groupNo += 1;
    let j = i + 1;
    while (j < rows.length && String(rows?.[j]?.boxGroupId || "").trim() === gid) j++;

    const span = j - i;
    meta[i] = { span, isStart: true, isEnd: span === 1, groupNo, groupId: gid };

    for (let k = i + 1; k < j; k++) {
      meta[k] = { span: 0, isStart: false, isEnd: k === j - 1, groupNo, groupId: gid };
    }

    i = j;
  }

  return meta;
}

/* ===== Helpers: Images API ===== */
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
  const res = await fetch(
    `${API_BASE}/api/images?url=${encodeURIComponent(url)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}

async function sendOneToServer({ reportDate, items }) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "anonymous",
      type: "enoc_returns",
      payload: { reportDate, items },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Server ${res.status}: ${t}`);
  }
  return res.json();
}

/* ===== Duplicate date check (FIXED) =====
   Previous logic could mark "duplicate" even with a different date
   if the server doesn't actually filter by reportDate query.
   Now: fetch all enoc_returns and check matching payload.reportDate locally.
*/
async function checkDuplicateReportDateOnServer(reportDate) {
  const url = `${API_BASE}/api/reports?type=enoc_returns`;
  const target = String(reportDate || "").slice(0, 10);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { duplicate: false, ref: "—", unknown: true };

    const data = await res.json().catch(() => null);
    if (!data) return { duplicate: false, ref: "—", unknown: true };

    const arr =
      (Array.isArray(data) && data) ||
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.reports) && data.reports) ||
      (Array.isArray(data?.data) && data.data) ||
      [];

    const match = arr.find((r) => {
      const p = r?.payload || {};
      const d =
        p?.reportDate ||
        p?.header?.reportDate ||
        r?.reportDate ||
        r?.date ||
        "";
      return String(d).slice(0, 10) === target;
    });

    if (match) {
      const ref = match?.id || match?._id || match?.payload?.id || "—";
      return { duplicate: true, ref };
    }

    return { duplicate: false, ref: "—" };
  } catch {
    return { duplicate: false, ref: "—", unknown: true };
  }
}

/* ================= Password Modal ================= */
function PasswordModal({ show, onSubmit, onClose, error }) {
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (show) setPassword("");
  }, [show]);
  if (!show) return null;

  return (
    <div style={modalBack}>
      <div style={modalCard}>
        <button onClick={onClose} style={modalCloseBtn} aria-label="Close">
          ✖
        </button>

        <div style={modalTitle}>🔒 ENOC Returns – Password Required</div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(password);
          }}
        >
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="Enter password"
            style={modalInput}
            value={password}
            onChange={(e) =>
              setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            onKeyDown={(e) => e.stopPropagation()}
          />

          <button type="submit" style={modalBtn}>
            Sign in
          </button>

          {error && <div style={modalErr}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

/* ===== Images Manager Modal ===== */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }) {
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

  const pick = () => inputRef.current?.click();

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
          <div style={galleryTitle}>
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
                maxHeight: "70vh",
                borderRadius: 12,
                boxShadow: "0 6px 18px rgba(0,0,0,.2)",
              }}
            />
          </div>
        )}

        <div style={galleryActions}>
          <button onClick={pick} style={btnBlueModal} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload images"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 13, color: "#334155" }}>
            Unlimited images per item (server compresses automatically).
          </div>
        </div>

        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile} title={`Image ${i + 1}`}>
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

/* ====================== PAGE ====================== */
export default function ENOCReturnsInput() {
  const navigate = useNavigate();

  /* Password gate */
  const [modalOpen, setModalOpen] = useState(true);
  const [modalError, setModalError] = useState("");

  const handleSubmitPassword = (val) => {
    if (val === ENOC_RETURNS_CREATE_PASSWORD) {
      setModalOpen(false);
      setModalError("");
    } else {
      setModalError("Wrong password!");
    }
  };

  const handleCloseModal = () => {
    navigate("/returns/menu", { replace: true });
  };

  /* Row factory */
  const blankRow = () => ({
    boxGroupId: "",
    boxCode: "",
    boxName: "",
    boxQty: "",
    productName: "",
    butchery: "",
    customButchery: "",
    quantity: "",
    qtyType: "PCS",
    customQtyType: "",
    expiry: "",
    remarks: "",
    action: "",
    customAction: "",
    images: [],
  });

  /* Form */
  const [reportDate, setReportDate] = useState(getToday());
  const [rows, setRows] = useState([blankRow()]);
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [rowErrors, setRowErrors] = useState({});
  const [groupErrors, setGroupErrors] = useState({});

  const groupMeta = useMemo(() => computeBoxGroups(rows), [rows]);

  /* ===== Draft load once ===== */
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }
      const data = JSON.parse(raw);
      const loadedRows =
        Array.isArray(data?.rows) && data.rows.length ? data.rows : null;
      const loadedDate =
        typeof data?.reportDate === "string" ? data.reportDate : null;

      if (loadedDate) setReportDate(loadedDate);
      if (loadedRows) setRows(loadedRows);

      if (loadedRows || loadedDate) {
        setSaveMsg("Draft loaded.");
        setTimeout(() => setSaveMsg(""), 1500);
      }
    } catch {
      // ignore
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  /* ===== Draft autosave (only after password) ===== */
  useEffect(() => {
    if (modalOpen) return;
    if (!hydratedRef.current) return;

    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ reportDate, rows, ts: Date.now() })
        );
      } catch {
        // ignore
      }
    }, 250);

    return () => clearTimeout(t);
  }, [reportDate, rows, modalOpen]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setSaveMsg("Draft cleared.");
    setTimeout(() => setSaveMsg(""), 1500);
  };

  const addNewBox = () => {
    const r = blankRow();
    r.boxGroupId = makeGroupId();
    setRows((prev) => [...prev, r]);
  };

  const removeRow = (index) =>
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [blankRow()];
    });

  const getGroupRange = (idx) => {
    const gid = String(groupMeta[idx]?.groupId || "").trim();
    if (!gid) return { start: idx, end: idx, groupId: "" };

    let start = idx;
    let end = idx;
    while (
      start > 0 &&
      String(groupMeta[start - 1]?.groupId || "").trim() === gid
    )
      start--;
    while (
      end < rows.length - 1 &&
      String(groupMeta[end + 1]?.groupId || "").trim() === gid
    )
      end++;
    return { start, end, groupId: gid };
  };

  const removeWholeBox = (idx) => {
    const { start, end, groupId } = getGroupRange(idx);
    if (!groupId) {
      removeRow(idx);
      return;
    }
    setRows((prev) => {
      const next = prev.filter((_, i) => i < start || i > end);
      return next.length ? next : [blankRow()];
    });
    setSaveMsg("Box removed.");
    setTimeout(() => setSaveMsg(""), 1500);
  };

  /* Set group fields (merged columns). For boxQty: also auto-fill QUANTITY with same number (editable). */
  const setGroupField = (idx, field, value) => {
    const { start, end, groupId } = getGroupRange(idx);

    const oldBoxQty = rows?.[start]?.boxQty;
    const oldBoxQtyNum = Number(oldBoxQty);

    setRows((prev) =>
      prev.map((r, i) => {
        if (i < start || i > end) return r;

        const next = { ...r, [field]: value };

        if (!next.boxGroupId) next.boxGroupId = groupId || makeGroupId();

        if (field === "butchery" && value !== OTHER_SITE) {
          next.customButchery = "";
        }

        if (field === "boxQty") {
          const newNum = Number(value);
          const qtyNum = Number(r.quantity);

          const shouldAuto =
            r.quantity === "" ||
            (Number.isFinite(qtyNum) &&
              Number.isFinite(oldBoxQtyNum) &&
              qtyNum === oldBoxQtyNum);

          if (shouldAuto && Number.isFinite(newNum) && newNum > 0) {
            next.quantity = String(newNum);
          }
        }

        return next;
      })
    );
  };

  const applyBoxAtRow = (idx, rawCode) => {
    const code = onlyDigits5(rawCode);
    const box = BOX_CATALOG[code];

    setRows((prev) => {
      const current = prev[idx] || blankRow();
      const next = [...prev];

      const gid = current.boxGroupId || makeGroupId();

      next[idx] = { ...current, boxGroupId: gid, boxCode: code };

      if (code.length < 5) {
        next[idx] = { ...next[idx], boxName: "" };
        return next;
      }

      if (!box) {
        next[idx] = { ...next[idx], boxName: "" };
        return next;
      }

      const common = {
        boxGroupId: gid,
        boxCode: code,
        boxName: box.name,
        boxQty: current.boxQty || "",
        butchery: current.butchery || "",
        customButchery: current.customButchery || "",
        expiry: current.expiry || "",
        remarks: current.remarks || "",
        action: current.action || "",
        customAction: current.customAction || "",
      };

      const autoQty = common.boxQty ? String(common.boxQty) : "";

      const generated = box.items.map((it, i) => {
        const pname = `[${it.code}] ${it.name}`;
        const qtyType = guessQtyTypeFromName(it.name);
        return {
          ...blankRow(),
          ...common,
          productName: pname,
          qtyType,
          quantity: autoQty,
          images:
            i === 0 ? (Array.isArray(current.images) ? current.images : []) : [],
        };
      });

      next.splice(idx, 1, ...generated);
      return next;
    });

    if (BOX_CATALOG[code] && code.length >= 5) {
      setSaveMsg("Box items loaded automatically.");
      setTimeout(() => setSaveMsg(""), 2000);
    }
  };

  const handleChange = (idx, field, value) => {
    if (field === "boxCode") {
      applyBoxAtRow(idx, value);
      return;
    }

    if (field === "boxQty" || field === "butchery" || field === "customButchery") {
      if (field === "customButchery") {
        setGroupField(idx, "customButchery", value);
        return;
      }
      setGroupField(idx, field, value);
      return;
    }

    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === "action" && value !== "Other...") updated[idx].customAction = "";
      if (field === "qtyType" && value !== "Other") updated[idx].customQtyType = "";

      return updated;
    });
  };

  /* Images */
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
      prev.map((r, i) =>
        i === imageRowIndex ? { ...r, images: [...(r.images || []), ...urls] } : r
      )
    );
    setSaveMsg("Images added.");
    setTimeout(() => setSaveMsg(""), 1500);
  };

  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;
    try {
      const url = rows?.[imageRowIndex]?.images?.[imgIndex];

      setRows((prev) =>
        prev.map((r, i) => {
          if (i !== imageRowIndex) return r;
          const next = Array.isArray(r.images) ? [...r.images] : [];
          next.splice(imgIndex, 1);
          return { ...r, images: next };
        })
      );

      if (url) {
        try {
          await deleteImage(url);
        } catch {
          // ignore
        }
      }

      setSaveMsg("Image removed.");
    } catch (e) {
      console.error(e);
      setSaveMsg("Failed to remove image.");
    } finally {
      setTimeout(() => setSaveMsg(""), 1500);
    }
  };

  /* ===== Validation (group + row) ===== */
  const validateBeforeSave = (preparedRows) => {
    const rErr = {};
    const gErr = {};

    const groups = new Map();
    preparedRows.forEach((r, idx) => {
      const gid = String(r.boxGroupId || "").trim();
      if (!gid) return;
      if (!groups.has(gid)) groups.set(gid, { idxs: [] });
      groups.get(gid).idxs.push(idx);
    });

    for (const [gid, info] of groups.entries()) {
      const firstIdx = info.idxs[0];
      const head = preparedRows[firstIdx];

      const hasAnyRow = info.idxs.some((i) => !!preparedRows[i]?.productName);
      if (!hasAnyRow) continue;

      const boxCodeOk = /^\d{5}$/.test(String(head.boxCode || ""));
      const locOk = !!String(head.butchery || "").trim();
      const boxQtyNum = Number(head.boxQty);
      const boxQtyOk = Number.isFinite(boxQtyNum) && boxQtyNum > 0;

      if (!boxCodeOk || !locOk || !boxQtyOk) {
        gErr[gid] = true;
        info.idxs.forEach((i) => (rErr[i] = true));
      }
    }

    preparedRows.forEach((r, idx) => {
      const pnameOk = !!String(r.productName || "").trim();
      const qtyNum = Number(r.quantity);
      const qtyOk = Number.isFinite(qtyNum) && qtyNum >= 0;

      const qtyType = String(r.qtyType || "PCS");
      const qtyTypeOk = qtyType !== "Other" || !!String(r.customQtyType || "").trim();

      const act = String(r.action || "");
      const actionOk =
        !!act && (act !== "Other..." || !!String(r.customAction || "").trim());

      if (!pnameOk || !qtyOk || !qtyTypeOk || !actionOk) {
        rErr[idx] = true;
      }
    });

    const ok =
      Object.keys(rErr).length === 0 && Object.keys(gErr).length === 0;

    let msg = "";
    if (!ok) {
      msg =
        "Please fix highlighted rows: Box Code (5 digits), Box Qty, Location, Product, Quantity, Qty Type (if Other), and Action (if Other).";
    }

    return { ok, msg, rErr, gErr };
  };

  /* Save */
  const handleSave = async () => {
    if (saving) return;

    setRowErrors({});
    setGroupErrors({});

    // Duplicate date check (block if already exists)
    try {
      setSaving(true);
      setSaveMsg("Checking report date...");
      const dup = await checkDuplicateReportDateOnServer(reportDate);
      if (dup?.duplicate) {
        setSaveMsg(`This date already has a saved report. Ref: ${dup.ref}`);
        setSaving(false);
        setTimeout(() => setSaveMsg(""), 3500);
        return;
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }

    const prepared = rows.map((r) => {
      const q = Number(r.quantity);
      const bq = Number(r.boxQty);

      return {
        ...r,
        boxGroupId: String(r.boxGroupId || "").trim(),
        boxCode: (r.boxCode || "").trim(),
        boxName: (r.boxName || "").trim(),
        boxQty: Number.isFinite(bq) && bq > 0 ? bq : "",
        productName: (r.productName || "").trim(),
        butchery: (r.butchery || "").trim(),
        customButchery: (r.customButchery || "").trim(),
        quantity: Number.isFinite(q) && q >= 0 ? q : "",
        qtyType: (r.qtyType || "").trim(),
        customQtyType: (r.customQtyType || "").trim(),
        expiry: (r.expiry || "").trim(),
        remarks: (r.remarks || "").trim(),
        action: (r.action || "").trim(),
        customAction: (r.customAction || "").trim(),
        images: Array.isArray(r.images) ? r.images : [],
      };
    });

    const filtered = prepared.filter((r) => {
      const hasKey = !!r.productName;
      const hasMeaningful =
        r.boxCode ||
        r.boxName ||
        r.boxQty !== "" ||
        r.butchery ||
        r.customButchery ||
        r.quantity !== "" ||
        r.expiry ||
        r.remarks ||
        r.action ||
        r.customAction ||
        (r.images && r.images.length > 0);
      return hasKey && hasMeaningful;
    });

    if (!filtered.length) {
      setSaveMsg("No valid rows to save. Add at least a product name.");
      setTimeout(() => setSaveMsg(""), 2500);
      return;
    }

    const v = validateBeforeSave(filtered);
    if (!v.ok) {
      setRowErrors(v.rErr || {});
      setGroupErrors(v.gErr || {});
      setSaveMsg(v.msg || "Please fix validation errors.");
      setTimeout(() => setSaveMsg(""), 4000);
      return;
    }

    try {
      setSaving(true);
      setSaveMsg("Saving to server...");
      const res = await sendOneToServer({ reportDate, items: filtered });
      setSaveMsg(`Saved successfully. Ref: ${res?.id || "—"}`);

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    } catch (err) {
      setSaveMsg("Save failed. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const cellStyleForRow = (idx) => {
    const m = groupMeta[idx] || { isStart: true, isEnd: true };
    const top = m.isStart ? "3px solid #111827" : "1px solid #e5e7eb";
    const bottom = m.isEnd ? "3px solid #111827" : "1px solid #e5e7eb";
    return { borderTop: top, borderBottom: bottom };
  };

  const inputWithErr = (idx) => {
    if (!rowErrors?.[idx]) return input;
    return { ...input, border: "2px solid #ef4444", background: "#fff1f2" };
  };

  const mergedCellWithGroupErr = (idx) => {
    const gid = String(groupMeta?.[idx]?.groupId || "").trim();
    if (!gid || !groupErrors?.[gid]) return mergedCell;
    return { ...mergedCell, background: "#fff1f2" };
  };

  if (modalOpen) {
    return (
      <PasswordModal
        show={modalOpen}
        onSubmit={handleSubmitPassword}
        onClose={handleCloseModal}
        error={modalError}
      />
    );
  }

  return (
    <div style={pageWrap}>
      <h2 style={pageTitle}>⛽ ENOC Returns Register</h2>

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
          <button
            onClick={handleSave}
            disabled={saving}
            style={saving ? btnSaveDisabled : btnSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button onClick={() => navigate("/enoc-returns/browse")} style={btnView}>
            View Reports
          </button>

          <button onClick={clearDraft} style={btnDraft}>
            Clear Draft
          </button>

          {saveMsg && <div style={msgBox}>{saveMsg}</div>}
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>SL.NO (Box)</th>
              <th style={th}>BOX CODE</th>
              <th style={th}>BOX NAME</th>
              <th style={th}>BOX QTY</th>
              <th style={th}>LOCATION</th>
              <th style={th}>PRODUCT</th>
              <th style={th}>QUANTITY</th>
              <th style={th}>QTY TYPE</th>
              <th style={th}>EXPIRY</th>
              <th style={th}>REMARKS</th>
              <th style={th}>ACTION</th>
              <th style={th}>IMAGES</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const m = groupMeta[idx] || {
                span: 1,
                isStart: true,
                isEnd: true,
                groupNo: idx + 1,
                groupId: "",
              };
              const borders = cellStyleForRow(idx);

              return (
                <tr key={idx} style={{ background: idx % 2 ? "#fbfbff" : "#fff" }}>
                  {/* SL.NO merged */}
                  {m.span > 0 && (
                    <td
                      style={{
                        ...td,
                        ...cellBorder,
                        ...borders,
                        ...mergedCellWithGroupErr(idx),
                      }}
                      rowSpan={m.span}
                    >
                      <div style={{ fontWeight: 900, fontSize: 16, color: "#111827" }}>
                        {m.groupNo}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Box</div>

                      <button
                        onClick={() => removeWholeBox(idx)}
                        style={btnDeleteBox}
                        title="Delete whole box"
                      >
                        Delete box
                      </button>
                    </td>
                  )}

                  {/* BOX CODE merged */}
                  {m.span > 0 && (
                    <td
                      style={{
                        ...td,
                        ...cellBorder,
                        ...borders,
                        ...mergedCellWithGroupErr(idx),
                      }}
                      rowSpan={m.span}
                    >
                      <input
                        style={inputWithErr(idx)}
                        placeholder="e.g. 99512"
                        value={row.boxCode || ""}
                        onChange={(e) => handleChange(idx, "boxCode", e.target.value)}
                      />
                      <div style={hint}>Enter a 5-digit box code to auto-load items</div>
                    </td>
                  )}

                  {/* BOX NAME merged */}
                  {m.span > 0 && (
                    <td
                      style={{
                        ...td,
                        ...cellBorder,
                        ...borders,
                        ...mergedCellWithGroupErr(idx),
                      }}
                      rowSpan={m.span}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#0f172a",
                          lineHeight: 1.35,
                          whiteSpace: "normal",
                        }}
                      >
                        {row.boxName || "—"}
                      </div>
                    </td>
                  )}

                  {/* BOX QTY merged */}
                  {m.span > 0 && (
                    <td
                      style={{
                        ...td,
                        ...cellBorder,
                        ...borders,
                        ...mergedCellWithGroupErr(idx),
                      }}
                      rowSpan={m.span}
                    >
                      <input
                        type="number"
                        min="1"
                        style={inputWithErr(idx)}
                        placeholder="e.g. 3"
                        value={row.boxQty}
                        onChange={(e) => handleChange(idx, "boxQty", e.target.value)}
                      />
                      <div style={hint}>
                        Auto-fills each item QUANTITY with this number (editable per row)
                      </div>
                    </td>
                  )}

                  {/* LOCATION merged */}
                  {m.span > 0 && (
                    <td
                      style={{
                        ...td,
                        ...cellBorder,
                        ...borders,
                        ...mergedCellWithGroupErr(idx),
                      }}
                      rowSpan={m.span}
                    >
                      <select
                        style={inputWithErr(idx)}
                        value={row.butchery || ""}
                        onChange={(e) => handleChange(idx, "butchery", e.target.value)}
                      >
                        <option value="">Select site</option>
                        {BRANCHES.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>

                      {row.butchery === OTHER_SITE && (
                        <input
                          style={{ ...inputWithErr(idx), marginTop: 8 }}
                          placeholder="Enter site name"
                          value={row.customButchery || ""}
                          onChange={(e) =>
                            handleChange(idx, "customButchery", e.target.value)
                          }
                        />
                      )}
                    </td>
                  )}

                  {/* PRODUCT */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <input
                      style={inputWithErr(idx)}
                      placeholder="Enter product"
                      value={row.productName || ""}
                      onChange={(e) => handleChange(idx, "productName", e.target.value)}
                    />
                  </td>

                  {/* QUANTITY */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <input
                      type="number"
                      min="0"
                      style={inputWithErr(idx)}
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                    />
                  </td>

                  {/* QTY TYPE */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <select
                      style={inputWithErr(idx)}
                      value={row.qtyType || "PCS"}
                      onChange={(e) => handleChange(idx, "qtyType", e.target.value)}
                    >
                      {QTY_TYPES.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>

                    {row.qtyType === "Other" && (
                      <input
                        style={{ ...inputWithErr(idx), marginTop: 8 }}
                        placeholder="Enter type"
                        value={row.customQtyType || ""}
                        onChange={(e) =>
                          handleChange(idx, "customQtyType", e.target.value)
                        }
                      />
                    )}
                  </td>

                  {/* EXPIRY */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <input
                      type="date"
                      style={inputWithErr(idx)}
                      value={row.expiry || ""}
                      onChange={(e) => handleChange(idx, "expiry", e.target.value)}
                    />
                  </td>

                  {/* REMARKS */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <input
                      style={inputWithErr(idx)}
                      placeholder="Remarks"
                      value={row.remarks || ""}
                      onChange={(e) => handleChange(idx, "remarks", e.target.value)}
                    />
                  </td>

                  {/* ACTION */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <select
                      style={inputWithErr(idx)}
                      value={row.action || ""}
                      onChange={(e) => handleChange(idx, "action", e.target.value)}
                    >
                      <option value="">Select action</option>
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>

                    {row.action === "Other..." && (
                      <input
                        style={{ ...inputWithErr(idx), marginTop: 8 }}
                        placeholder="Enter custom action"
                        value={row.customAction || ""}
                        onChange={(e) =>
                          handleChange(idx, "customAction", e.target.value)
                        }
                      />
                    )}
                  </td>

                  {/* IMAGES */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    <button
                      onClick={() => openImagesFor(idx)}
                      style={btnImg}
                      title="Manage images"
                    >
                      Images ({Array.isArray(row.images) ? row.images.length : 0})
                    </button>
                  </td>

                  {/* DELETE ROW */}
                  <td style={{ ...td, ...cellBorder, ...borders }}>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} style={btnDel} title="Delete row">
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

      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button onClick={addNewBox} style={btnAdd}>
          Add new box
        </button>
      </div>

      <ImageManagerModal
        open={imageModalOpen}
        row={imageRowIndex >= 0 ? rows?.[imageRowIndex] || {} : null}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
      />
    </div>
  );
}

/* ====== STYLES (FULL WIDTH, NO HORIZONTAL SCROLL) ====== */
const pageWrap = {
  fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  padding: 16,
  background: "#f4f6fa",
  minHeight: "100vh",
  width: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const pageTitle = {
  textAlign: "center",
  color: "#512e5f",
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
  background: "#884ea0",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  boxShadow: "0 2px 10px rgba(136,78,160,.18)",
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
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  padding: "8px 10px",
  borderRadius: 10,
  maxWidth: 520,
  whiteSpace: "normal",
};

const tableWrap = {
  width: "100%",
  overflowX: "hidden",
};

const table = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 2px 16px rgba(0,0,0,.08)",
};

const th = {
  padding: "12px 8px",
  textAlign: "center",
  fontSize: 13,
  fontWeight: 900,
  color: "#512e5f",
  background: "#e8daef",
  borderBottom: "2px solid #c7a8dc",
  wordBreak: "break-word",
};

const td = {
  padding: "10px 8px",
  textAlign: "center",
  verticalAlign: "middle",
  wordBreak: "break-word",
  whiteSpace: "normal",
};

const cellBorder = {
  borderLeft: "1px solid #eef2f7",
  borderRight: "1px solid #eef2f7",
};

const mergedCell = {
  background: "#f8fafc",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  borderRadius: 10,
  border: "1.5px solid #c7a8dc",
  background: "#fcf6ff",
  fontSize: 13,
  fontWeight: 700,
};

const hint = {
  marginTop: 8,
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.35,
  textAlign: "left",
};

const btnSave = {
  background: "#229954",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 14px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(34,153,84,.18)",
};

const btnSaveDisabled = {
  ...btnSave,
  background: "#7fbf9f",
  cursor: "not-allowed",
};

const btnView = {
  background: "#884ea0",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 14px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(136,78,160,.18)",
};

const btnDraft = {
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 14px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(15,23,42,.18)",
};

const btnImg = {
  width: "100%",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 10px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 1px 6px rgba(37,99,235,.22)",
};

const btnDel = {
  width: "100%",
  background: "#c0392b",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 10px",
  cursor: "pointer",
};

const btnAdd = {
  background: "#512e5f",
  color: "#fff",
  border: "none",
  borderRadius: 14,
  fontWeight: 900,
  fontSize: 14,
  padding: "12px 18px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(81,46,95,.18)",
};

const btnDeleteBox = {
  marginTop: 10,
  width: "100%",
  background: "#b91c1c",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 10px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(185,28,28,.18)",
};

/* ====== MODAL STYLES ====== */
const modalBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalCard = {
  background: "#fff",
  padding: "18px 18px",
  borderRadius: 16,
  width: "min(420px, 92vw)",
  boxShadow: "0 12px 32px rgba(0,0,0,.22)",
  position: "relative",
  fontFamily: "Cairo, system-ui, sans-serif",
};

const modalCloseBtn = {
  position: "absolute",
  top: 10,
  right: 12,
  fontSize: 18,
  background: "transparent",
  border: "none",
  color: "#c0392b",
  cursor: "pointer",
  fontWeight: 900,
};

const modalTitle = {
  fontWeight: 900,
  fontSize: 16,
  color: "#2563eb",
  marginBottom: 12,
  textAlign: "center",
};

const modalInput = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 12px",
  fontSize: 14,
  border: "1.8px solid #b2babb",
  borderRadius: 12,
  marginBottom: 12,
  background: "#f8fafc",
  fontWeight: 800,
};

const modalBtn = {
  width: "100%",
  background: "#884ea0",
  color: "#fff",
  border: "none",
  padding: "12px 0",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 2px 12px rgba(136,78,160,.18)",
};

const modalErr = {
  color: "#c0392b",
  fontWeight: 900,
  marginTop: 10,
  textAlign: "center",
};

/* ====== GALLERY MODAL ====== */
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
  width: "min(1200px, 96vw)",
  maxHeight: "80vh",
  overflow: "auto",
  background: "#fff",
  color: "#111",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
};

const galleryTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const galleryTitle = {
  fontWeight: 900,
  fontSize: "1.05rem",
  color: "#0f172a",
};

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

const btnBlueModal = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 1px 6px rgba(37,99,235,.22)",
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
