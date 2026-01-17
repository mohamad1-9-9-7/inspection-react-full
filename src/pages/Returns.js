// src/pages/Returns.js

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

/* ========= ثوابت ========= */
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
  "POS 43",
  "POS 44",
  "POS 45",
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

const QTY_TYPES = ["KG", "PCS", "أخرى / Other"];
const RETURNS_CREATE_PASSWORD = "9999";

/* ========= Helpers ========= */
function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}
function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
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

/* ===== Reports API ===== */
async function tryFetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

/**
 * Try to find existing returns report for same reportDate.
 * Works if server supports GET /api/reports?type=returns (common in your project style).
 * Returns existing report id or null.
 */
async function findExistingReturnsReportId(reportDate) {
  const candidates = [
    `${API_BASE}/api/reports?type=returns`,
    `${API_BASE}/api/reports?type=returns&limit=500`,
  ];

  for (const url of candidates) {
    try {
      const j = await tryFetchJSON(url);

      // server may return array or {items:[]} or {reports:[]}
      const list = Array.isArray(j)
        ? j
        : Array.isArray(j?.items)
        ? j.items
        : Array.isArray(j?.reports)
        ? j.reports
        : [];

      if (!list.length) continue;

      const hit = list.find((r) => {
        const d =
          r?.payload?.reportDate ||
          r?.payload?.date ||
          r?.reportDate ||
          r?.date;
        return String(d || "").slice(0, 10) === reportDate;
      });

      if (hit) return getId(hit) || null;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Create or upsert:
 * - If existingId provided, include it so server can upsert/update.
 * - If server ignores id, it still creates new; but we already tried to prevent duplicates.
 */
async function sendOneToServer({ reportDate, items, existingId }) {
  const body = {
    reporter: "anonymous",
    type: "returns",
    payload: { reportDate, items },
    // extra hints for servers that support upsert
    id: existingId || undefined,
    upsert: true,
    meta: {
      unique_key: `returns__${reportDate}`,
    },
  };

  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
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
        direction: "rtl",
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
            left: 15,
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
          🔒 كلمة سر إنشاء المرتجعات / Password required
        </div>
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
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            autoFocus
            placeholder="أدخل كلمة السر / Enter password"
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
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
            دخول / Sign in
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
          <div style={{ fontSize: 13, color: "#334155" }}>Unlimited images per item (server compresses automatically).</div>
        </div>
        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile} title={`Image ${i + 1}`}>
                <img src={src} alt={`img-${i}`} style={thumbImg} onClick={() => setPreviewSrc(src)} />
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
            * سيتم منع التكرار تلقائياً. الحفظ دائم محلياً، وسيتم محاولة الحفظ على السيرفر إن كان endpoint متوفر.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== الصفحة الرئيسية ====================== */
export default function Returns() {
  const navigate = useNavigate();

  /* ===== Password ===== */
  const [modalOpen, setModalOpen] = useState(true);
  const [modalError, setModalError] = useState("");
  const handleSubmitPassword = (val) => {
    if (val === RETURNS_CREATE_PASSWORD) {
      setModalOpen(false);
      setModalError("");
    } else {
      setModalError("❌ كلمة السر غير صحيحة! / Wrong password!");
    }
  };
  const handleCloseModal = () => navigate("/returns/menu", { replace: true });

  /* ===== UI ===== */
  const [compact, setCompact] = useState(true);

  /* ===== Data ===== */
  const [reportDate, setReportDate] = useState(getToday());
  const makeEmptyRow = () => ({
    itemCode: "",
    productName: "",
    origin: "",
    butchery: "",
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

  const [rows, setRows] = useState([makeEmptyRow()]);
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===== تحميل الأصناف من /public/data/items.json ===== */
  const [itemsAll, setItemsAll] = useState([]); // [{item_code, description}]
  const [itemsLoadError, setItemsLoadError] = useState("");

  useEffect(() => {
    const tryLoad = async () => {
      setItemsLoadError("");
      try {
        const r1 = await fetch("/data/items.json", { cache: "no-store" });
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
        const r2 = await fetch(`${base}/data/items.json`, { cache: "no-store" });
        if (r2.ok) {
          const j = await r2.json();
          if (Array.isArray(j)) {
            setItemsAll(j);
            return;
          }
        }
        setItemsLoadError("⚠️ لم أستطع قراءة /data/items.json. تأكد من وجود الملف في public/data وفتح الرابط مباشرة بالمتصفح.");
      } catch (err) {
        console.error("items load failed:", err);
        setItemsLoadError("⚠️ فشل تحميل ملف الأصناف.");
      }
    };
    tryLoad();
  }, []);

  /* ===== Custom Items (Add new code) ===== */
  const CUSTOM_ITEMS_KEY = "returns_custom_items_v1";
  const [customItems, setCustomItems] = useState([]);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemError, setAddItemError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_ITEMS_KEY);
      const j = raw ? JSON.parse(raw) : [];
      if (Array.isArray(j)) setCustomItems(j);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems));
    } catch {
      // ignore
    }
  }, [customItems]);

  const normalize = (v) =>
    String(v ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[-_()\/\\]/g, "");

  const allItems = useMemo(() => {
    // Merge itemsAll + customItems unique by item_code normalized
    const map = new Map();
    const push = (it) => {
      const code = String(it?.item_code ?? it?.itemCode ?? "").trim();
      const name = String(it?.description ?? it?.productName ?? it?.name ?? "").trim();
      if (!code || !name) return;
      const key = normalize(code);
      if (!key) return;
      if (!map.has(key)) map.set(key, { item_code: code, description: name, __custom: !!it.__custom });
    };
    safeArr(itemsAll).forEach(push);
    safeArr(customItems).forEach((x) => push({ ...x, __custom: true }));
    return Array.from(map.values());
  }, [itemsAll, customItems]);

  async function trySaveCustomItemToServer(item) {
    // Optional: if you have an endpoint, this will persist server-side.
    // If not available, it will silently fail and localStorage is still used.
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
    if (!c) return setAddItemError("❌ ITEM CODE مطلوب.");
    if (!n) return setAddItemError("❌ PRODUCT NAME مطلوب.");

    const key = normalize(c);
    const exists = allItems.some((it) => normalize(it.item_code) === key);
    if (exists) return setAddItemError("❌ هذا الكود موجود مسبقاً (Duplicate).");

    const newItem = { item_code: c, description: n };
    setCustomItems((prev) => [newItem, ...prev]);
    setAddItemOpen(false);
    setSaveMsg("✅ Item added to catalog.");
    setTimeout(() => setSaveMsg(""), 1800);

    // Try server persist (optional)
    try {
      await trySaveCustomItemToServer(newItem);
    } catch {
      // ignore
    }

    // If user already typed this code in a row, auto-fill its name
    setRows((prev) =>
      prev.map((r) => {
        if (normalize(r.itemCode) === key && !String(r.productName || "").trim()) {
          return { ...r, productName: n };
        }
        return r;
      })
    );
  };

  /* ===== البحث المحلي + التطبيع ===== */
  const [itemHints, setItemHints] = useState({}); // { idx: [...] }
  const [hintSel, setHintSel] = useState({}); // { idx: selectedIndex }
  const [activeCell, setActiveCell] = useState({ row: null, field: null }); // أي خلية نشطة

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

  const showHintsFor = (idx, q) => {
    const results = localSearch(q);
    setItemHints((h) => ({ ...h, [idx]: results }));
    setHintSel((h) => ({ ...h, [idx]: results.length ? 0 : -1 }));
  };

  const tryExactFill = (idx, field, value) => {
    const s = normalize(value);
    if (!s) return;

    if (field === "itemCode") {
      const hit = allItems.find((it) => normalize(it.item_code) === s);
      if (hit) {
        setRows((prev) =>
          prev.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  itemCode: String(value ?? ""), // keep as typed
                  productName: hit.description,
                }
              : r
          )
        );
        setItemHints((h) => ({ ...h, [idx]: [] }));
        setHintSel((h) => ({ ...h, [idx]: -1 }));
      }
    } else if (field === "productName") {
      const hit = allItems.find((it) => normalize(it.description) === s);
      if (hit) {
        setRows((prev) =>
          prev.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  productName: String(value ?? ""),
                  itemCode: hit.item_code,
                }
              : r
          )
        );
        setItemHints((h) => ({ ...h, [idx]: [] }));
        setHintSel((h) => ({ ...h, [idx]: -1 }));
      }
    }
  };

  const pickItem = (idx, item) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? { ...r, itemCode: item.item_code, productName: item.description }
          : r
      )
    );
    setItemHints((h) => ({ ...h, [idx]: [] }));
    setHintSel((h) => ({ ...h, [idx]: -1 }));
    setActiveCell({ row: null, field: null }); // إغلاق القائمة
  };

  const addRow = () => setRows((prev) => [...prev, makeEmptyRow()]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, idx) => idx !== index));

  /* ===== Validation ===== */
  const [rowErrors, setRowErrors] = useState({}); // { idx: {field:true} }

  const validateBeforeSave = (preparedRows) => {
    // Validate rows that look "in use"
    const errors = {};
    const used = preparedRows.map((r, idx) => ({ r, idx })).filter(({ r }) => {
      const hasAnything =
        (r.itemCode || r.productName || r.origin || r.butchery || r.customButchery || r.expiry || r.remarks || r.action || r.customAction || (r.images?.length || 0) > 0 || r.quantity !== "");
      return hasAnything;
    });

    used.forEach(({ r, idx }) => {
      const e = {};

      const hasKey = !!(r.itemCode || r.productName);
      if (!hasKey) e.itemCode = true; // mark code cell as missing

      // required for a valid return row (clear and practical):
      if (!String(r.butchery || "").trim()) e.butchery = true;
      if (!(Number.isFinite(Number(r.quantity)) && Number(r.quantity) > 0)) e.quantity = true;
      if (!String(r.action || "").trim()) e.action = true;

      if (Object.keys(e).length) errors[idx] = e;
    });

    return errors;
  };

  const handleChange = (idx, field, value) => {
    // clear error when editing
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

      // keep itemCode as TEXT (avoid showing 0 / losing leading zeros)
      if (field === "itemCode") {
        current.itemCode = String(value ?? "");
        // show hints + exact fill
        updated[idx] = current;
        return updated;
      }

      current[field] = value;

      if (field === "butchery" && value !== "فرع آخر... / Other branch") current.customButchery = "";
      if (field === "action" && value !== "Other...") current.customAction = "";
      if (field === "qtyType" && value !== "أخرى / Other") current.customQtyType = "";

      updated[idx] = current;
      return updated;
    });

    if (field === "itemCode") {
      showHintsFor(idx, value);
      // IMPORTANT: auto fill when exact match (no mouse needed)
      tryExactFill(idx, "itemCode", value);
    }
    if (field === "productName") {
      showHintsFor(idx, value);
      tryExactFill(idx, "productName", value);
    }
  };

  /* ===== الصور ===== */
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

  /* ===== الحفظ ===== */
  const handleSave = async () => {
    if (saving) return;

    // 1) تجهيز القيم
    const prepared = rows.map((r) => {
      const qNum = Number(r.quantity);
      return {
        ...r,
        itemCode: String(r.itemCode || "").trim(),
        productName: String(r.productName || "").trim(),
        origin: String(r.origin || "").trim(),
        butchery: String(r.butchery || "").trim(),
        customButchery: String(r.customButchery || "").trim(),
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

    // 2) Validation واضح
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

    // 3) فلترة الصفوف للحفظ (مثل قبل ولكن بعد validation)
    const filtered = prepared.filter((r) => {
      const hasKey = !!(r.itemCode || r.productName);
      const hasMeaningful =
        r.origin ||
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
      setSaveMsg("لا يوجد صف صالح للحفظ. أضف كود الصنف أو اسم المنتج مع بيانات إضافية.");
      setTimeout(() => setSaveMsg(""), 2500);
      return;
    }

    try {
      setSaving(true);
      setSaveMsg("⏳ جاري الحفظ على السيرفر… / Saving to server…");

      // 4) منع تكرار التقرير لنفس التاريخ: find existing id then upsert
      const existingId = await findExistingReturnsReportId(reportDate);
      if (existingId) {
        setSaveMsg("⏳ يوجد تقرير بنفس التاريخ — سيتم تحديثه (Update) بدل إنشاء جديد…");
      }

      const res = await sendOneToServer({ reportDate, items: filtered, existingId });
      setSaveMsg(`✅ تم الحفظ بنجاح. رقم المرجع: ${res?.id || res?._id || existingId || "—"}`);
    } catch (err) {
      setSaveMsg("❌ فشل الحفظ على السيرفر. حاول مجددًا. / Save failed. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3800);
    }
  };

  /* ===== Images modal ===== */
  const currentRowForImages = imageRowIndex >= 0 ? rows?.[imageRowIndex] || {} : null;

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

  const th = (w) => ({
    padding: compact ? "10px 6px" : "13px 7px",
    textAlign: "center",
    fontSize: compact ? "0.95em" : "1.05em",
    fontWeight: "bold",
    borderBottom: "2px solid #c7a8dc",
    width: w,
  });

  const td = {
    padding: compact ? "8px 6px" : "10px 6px",
    textAlign: "center",
    verticalAlign: "top",
  };

  const tdRel = { ...td, position: "relative", overflow: "visible" };

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
    <div style={{ fontFamily: "Cairo, sans-serif", padding: "2rem", background: "#f4f6fa", minHeight: "100vh", direction: "rtl" }}>
      <h2 style={{ textAlign: "center", color: "#512e5f", marginBottom: "1.7rem", fontWeight: "bold" }}>
        🛒 سجل المرتجعات (Returns Register)
      </h2>

      {/* حالة تحميل الأصناف + زر إضافة صنف */}
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

        {itemsLoadError && <span style={{ color: "#b71c1c", fontWeight: 800 }}>{itemsLoadError}</span>}
      </div>

      {/* تاريخ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 18, fontSize: "1.08em", flexWrap: "wrap" }}>
        <span
          style={{
            background: "#884ea0",
            color: "#fff",
            padding: "9px 14px",
            borderRadius: 14,
            boxShadow: "0 2px 10px #e8daef44",
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontWeight: "bold",
            flexWrap: "wrap",
          }}
        >
          <span role="img" aria-label="calendar" style={{ fontSize: 22 }}>
            📅
          </span>
          تاريخ إعداد التقرير / Report Date:
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{
              marginRight: 10,
              background: "#fcf6ff",
              border: "none",
              borderRadius: 7,
              padding: "7px 12px",
              fontWeight: "bold",
              fontSize: "1em",
              color: "#512e5f",
              boxShadow: "0 1px 4px #e8daef44",
            }}
          />
        </span>
      </div>

      {/* أزرار */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.9rem", marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#7fbf9f" : "#229954",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontWeight: "bold",
            fontSize: "1.02em",
            padding: "10px 26px",
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px #d4efdf",
          }}
        >
          {saving ? "…Saving" : "💾 حفظ / Save"}
        </button>

        <button
          onClick={() => navigate("/returns/view")}
          style={{
            background: "#884ea0",
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
          📋 عرض التقارير / View Reports
        </button>

        {saveMsg && (
          <span
            style={{
              marginRight: 8,
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

      {/* جدول (تقليل العرض الأفقي) */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 2px 16px #dcdcdc70",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ background: "#e8daef", color: "#512e5f", position: "sticky", top: 0, zIndex: 5 }}>
              <th style={th("70px")}>SL.NO</th>
              <th style={th("150px")}>ITEM CODE</th>
              <th style={th("280px")}>PRODUCT NAME</th>
              <th style={th("130px")}>ORIGIN</th>
              <th style={th("170px")}>BUTCHERY</th>
              <th style={th("120px")}>QUANTITY</th>
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
              return (
                <tr key={idx} style={{ background: idx % 2 ? "#fcf3ff" : "#fff" }}>
                  <td style={td}>{idx + 1}</td>

                  {/* ITEM CODE */}
                  <td style={tdRel}>
                    <input
                      type="text"
                      inputMode="numeric"
                      style={input(!!err.itemCode)}
                      placeholder="Enter code"
                      value={row.itemCode || ""}
                      onChange={(e) => handleChange(idx, "itemCode", e.target.value)}
                      onFocus={() => {
                        setActiveCell({ row: idx, field: "itemCode" });
                        showHintsFor(idx, row.itemCode || "");
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          setActiveCell((c) =>
                            c.row === idx && c.field === "itemCode" ? { row: null, field: null } : c
                          );
                        }, 120)
                      }
                      onKeyDown={(e) => {
                        const list = itemHints[idx] || [];
                        if (e.key === "Enter") {
                          e.preventDefault();
                          // if exact match, already auto-filled, else pick highlighted hint
                          if (list.length) pickItem(idx, list[hintSel[idx] ?? 0]);
                        }
                        if (e.key === "ArrowDown" && list.length) {
                          e.preventDefault();
                          setHintSel((h) => ({
                            ...h,
                            [idx]: Math.min((h[idx] ?? 0) + 1, list.length - 1),
                          }));
                        }
                        if (e.key === "ArrowUp" && list.length) {
                          e.preventDefault();
                          setHintSel((h) => ({
                            ...h,
                            [idx]: Math.max((h[idx] ?? 0) - 1, 0),
                          }));
                        }
                      }}
                    />

                    {(activeCell.row === idx && activeCell.field === "itemCode" && itemHints[idx]?.length) ? (
                      <div style={hintBox}>
                        {itemHints[idx].map((it, k) => (
                          <div
                            key={k}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickItem(idx, it)}
                            style={{
                              ...hintRow,
                              background: (hintSel[idx] ?? 0) === k ? "#eef2ff" : "transparent",
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>{it.item_code}</div>
                            <div style={{ fontSize: 12, color: "#475569", whiteSpace: "normal" }}>{it.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* helper small text if code not found */}
                    {row.itemCode && !allItems.some((it) => normalize(it.item_code) === normalize(row.itemCode)) && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#b45309", fontWeight: 800 }}>
                        Code not found — you can add it via “Add item”.
                      </div>
                    )}
                  </td>

                  {/* PRODUCT NAME */}
                  <td style={tdRel}>
                    <input
                      style={input(false)}
                      placeholder="Product name"
                      value={row.productName || ""}
                      onChange={(e) => handleChange(idx, "productName", e.target.value)}
                      onFocus={() => {
                        setActiveCell({ row: idx, field: "productName" });
                        showHintsFor(idx, row.productName || "");
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          setActiveCell((c) =>
                            c.row === idx && c.field === "productName" ? { row: null, field: null } : c
                          );
                        }, 120)
                      }
                      onKeyDown={(e) => {
                        const list = itemHints[idx] || [];
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (list.length) pickItem(idx, list[hintSel[idx] ?? 0]);
                        }
                        if (e.key === "ArrowDown" && list.length) {
                          e.preventDefault();
                          setHintSel((h) => ({
                            ...h,
                            [idx]: Math.min((h[idx] ?? 0) + 1, list.length - 1),
                          }));
                        }
                        if (e.key === "ArrowUp" && list.length) {
                          e.preventDefault();
                          setHintSel((h) => ({
                            ...h,
                            [idx]: Math.max((h[idx] ?? 0) - 1, 0),
                          }));
                        }
                      }}
                    />

                    {(activeCell.row === idx && activeCell.field === "productName" && itemHints[idx]?.length && !row.itemCode) ? (
                      <div style={hintBox}>
                        {itemHints[idx].map((it, k) => (
                          <div
                            key={k}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickItem(idx, it)}
                            style={{
                              ...hintRow,
                              background: (hintSel[idx] ?? 0) === k ? "#eef2ff" : "transparent",
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>{it.item_code}</div>
                            <div style={{ fontSize: 12, color: "#475569", whiteSpace: "normal" }}>{it.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </td>

                  {/* ORIGIN */}
                  <td style={td}>
                    <input
                      style={input(false)}
                      placeholder="Origin"
                      value={row.origin || ""}
                      onChange={(e) => handleChange(idx, "origin", e.target.value)}
                    />
                  </td>

                  {/* BUTCHERY */}
                  <td style={td}>
                    <select style={selectStyle(!!err.butchery)} value={row.butchery || ""} onChange={(e) => handleChange(idx, "butchery", e.target.value)}>
                      <option value="">{`Select branch`}</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    {row.butchery === "فرع آخر... / Other branch" && (
                      <input
                        style={{ ...input(false), marginTop: 6 }}
                        placeholder="Enter branch name"
                        value={row.customButchery || ""}
                        onChange={(e) => handleChange(idx, "customButchery", e.target.value)}
                      />
                    )}
                  </td>

                  {/* QUANTITY */}
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      style={input(!!err.quantity)}
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                    />
                  </td>

                  {/* QTY TYPE */}
                  <td style={td}>
                    <select style={selectStyle(false)} value={row.qtyType} onChange={(e) => handleChange(idx, "qtyType", e.target.value)}>
                      {QTY_TYPES.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                    {row.qtyType === "أخرى / Other" && (
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
                      type="date"
                      style={input(false)}
                      value={row.expiry}
                      onChange={(e) => handleChange(idx, "expiry", e.target.value)}
                    />
                  </td>

                  {/* REMARKS */}
                  <td style={td}>
                    <input
                      style={input(false)}
                      placeholder="Remarks"
                      value={row.remarks || ""}
                      onChange={(e) => handleChange(idx, "remarks", e.target.value)}
                    />
                  </td>

                  {/* ACTION */}
                  <td style={td}>
                    <select style={selectStyle(!!err.action)} value={row.action} onChange={(e) => handleChange(idx, "action", e.target.value)}>
                      <option value="">{`Select action`}</option>
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
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

                  {/* صور */}
                  <td style={td}>
                    <button onClick={() => openImagesFor(idx)} style={btnImg} title="Manage images">
                      🖼️ Images ({safeArr(row.images).length})
                    </button>
                  </td>

                  {/* حذف صف */}
                  <td style={td}>
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(idx)}
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

      <div style={{ marginTop: "1.3rem", textAlign: "center" }}>
        <button
          onClick={addRow}
          style={{
            background: "#512e5f",
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
    </div>
  );
}

/* ====== Styles ====== */
const inputBase = {
  padding: "7px 8px",
  borderRadius: 9,
  border: "1.5px solid #c7a8dc",
  background: "#fcf6ff",
  fontSize: "0.98em",
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

/* ====== Gallery modal styles ====== */
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
