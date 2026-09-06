// QCSRawMaterialForm.jsx
import React, { useEffect, useMemo, useRef, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../../assets/almawashi-logo.jpg";
import { ItemCodeInput, ItemNameInput } from "../_shared/CodedProductField";
import MultiDateField from "../_shared/MultiDateField";
import ShelfLifeModal from "../_shared/ShelfLifeModal";
import { useShelfLife, expiryFromProduction, productionFromExpiry } from "../_shared/shelfLife";
import { isoDatesIn } from "../_shared/dateTokens";
import { fetchBaseItems } from "../_shared/ProductPicker";
import { useSupplierEvaluations } from "../_shared/supplierEvaluation";
import {
  sendToServer,
  listReportsByType,
  postMeta,
  deriveUniqueKey,
  normStr,
  todayIso,
  toYMD,
  ymdToDMY,
  uploadImageToServer,
  makeClientId,
  deleteImage,
  getReporter,
} from "./qcsRawApi";

/* ===== Helpers & Constants ===== */
const makeStableId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

const ATTRIBUTES = [
  { key: "temperature", label: "Product Temperature", default: "" },
  { key: "ph", label: "Product PH", default: "" },
  { key: "slaughterDate", label: "Slaughter Date", default: "", type: "dates", required: true },
  { key: "expiryDate", label: "Expiry Date", default: "", type: "dates", required: true },
  { key: "broken", label: "Broken / Cut Pieces", default: "NIL" },
  { key: "appearance", label: "Appearance", default: "OK" },
  { key: "bloodClots", label: "Blood Clots", default: "NIL" },
  { key: "colour", label: "Colour", default: "OK" },
  { key: "fatDiscoloration", label: "Fat Discoloration", default: "NIL" },
  { key: "meatDamage", label: "Meat Damage", default: "NIL" },
  { key: "foreignMatter", label: "Hair / Foreign Matter", default: "NIL" },
  { key: "texture", label: "Texture", default: "OK" },
  { key: "testicles", label: "Testicles", default: "NIL" },
  { key: "smell", label: "Smell", default: "NIL" },
];

// 🔴 الحقول الإلزامية
const REQUIRED_FIELDS = new Set([
  "reportOn",
  "receivedOn",
  "inspectionDate",
  "brand",
  "origin",
  "invoiceNo",
  "receivingAddress",
  "inspectedBy",
  "verifiedBy",
]);
const REQUIRED_LABELS = {
  reportOn: "Report On",
  receivedOn: "Sample Received On",
  inspectionDate: "Inspection Date",
  brand: "Brand",
  origin: "Origin",
  invoiceNo: "Invoice No",
  receivingAddress: "Receiving Address",
  inspectedBy: "Inspected By",
  verifiedBy: "Verified By",
  shipmentType: "Shipment Type",
  createdDate: "Entry Date",
  // these three live in the sample columns, not in the header
  sampleProduct: "Product Name (العينات)",
  slaughterDate: "Slaughter Date (العينات)",
  expiryDate: "Expiry Date (العينات)",
  lineProduct: "Product Lines",
};

// 🏷️ Brand and 🌍 Origin used to be free text, so one shipment could be filed
//    under "AUS", "Aus." and "australia" at once. Both are lists now: the origin
//    seeded from the product catalog's own origin column, the brand kept on the
//    server exactly the way suppliers and shipment types already are.
const BRANDS_LS_KEY = "qcs_brands_v1";
const ORIGINS_LS_KEY = "qcs_origins_v1";
const FALLBACK_ORIGINS = ["AUS", "BRZ", "IND", "IRAN", "KAZ", "LOCAL", "NEZ", "PAK", "S.A"];

const TYPES_LS_KEY = "qcs_shipment_types_v1";
const DEFAULT_TYPES = [
  "LAMB AUS","MUTTON AUS","LAMB S.A","MUTTON S.A","VACUUM","FROZEN",
  "PAK","KHZ","IND MUTTON","IND VEAL","FRESH LAMB","FRESH CHICKEN",
];

const BRANCHES = [
  "QCS",
  "POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16","POS 17",
  "POS 18","POS 19","POS 21","POS 24","POS 25",
  "POS 26","POS 31","POS 34","POS 35","POS 36",
  "POS 37","POS 38","POS 41","POS 43",
];

const SAVE_COOLDOWN_MS = 1200;

/* ═════════════════════════════════════════════════════════ Styles

   Two layers, because globals.css forces "#root * { font-size: 14px }" with
   !important and an inline style cannot beat it: the inline styles object below
   for everything else, and one scoped stylesheet whose doubled class outranks
   the global rule so the sheet keeps a real type hierarchy.

   The same sheet also lifts overflow-x:hidden off the scroll ancestors while
   this page is mounted — that rule silently disables every position:sticky, and
   this form has a sticky table header and a sticky action bar. */

const SCOPED_CSS = `
#root .qcsShip.qcsShip .qs-title { font-size: 25px !important; letter-spacing: .2px; }
#root .qcsShip.qcsShip .qs-legend { font-size: 16px !important; }
#root .qcsShip.qcsShip .qs-label { font-size: 12px !important; letter-spacing: .4px; text-transform: uppercase; }
#root .qcsShip.qcsShip .qs-chip { font-size: 12px !important; }
#root .qcsShip.qcsShip .qs-hint { font-size: 11.5px !important; }
#root .qcsShip.qcsShip input,
#root .qcsShip.qcsShip select,
#root .qcsShip.qcsShip textarea { font-size: 14px !important; }
#root .qcsShip.qcsShip table input,
#root .qcsShip.qcsShip table select { font-size: 13px !important; }

/* position:sticky needs a scroll ancestor that is not overflow:hidden */
html:has(.qcsShip), body:has(.qcsShip), #root:has(.qcsShip) { overflow-x: clip; }

#root .qcsShip.qcsShip input:focus,
#root .qcsShip.qcsShip select:focus,
#root .qcsShip.qcsShip textarea:focus { border-color: #0284c7 !important; }
`;

const styles = {
  // 🎨 The palette is the ISO & HACCP one: the dashboard card's cyan
  //    (#0891b2 → #0e7490) over the same washed-white shell the ISO view pages
  //    use, so the form and the module it belongs to read as one system.
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 6%, rgba(34,211,238,0.18) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
      "radial-gradient(circle at 88% 8%, rgba(34,197,94,0.14) 0, rgba(255,255,255,0) 55%)",
    backgroundColor: "#ffffff",
    fontFamily: "Inter,Roboto,Cairo,sans-serif",
    color: "#071b2d",
  },
  hero: {
    position: "relative",
    background:
      "radial-gradient(1200px 260px at 15% 130%, rgba(255,255,255,.22), transparent 62%)," +
      "linear-gradient(135deg,#0891b2 0%,#0e7490 55%,#0c4a6e 100%)",
    boxShadow: "0 12px 32px rgba(8,145,178,.28)",
    padding: "18px clamp(12px,1.8vw,28px) 74px",
    zIndex: 0,
  },
  heroInner: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  heroIdentity: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 },
  heroLogo: {
    width: 54,
    height: 54,
    borderRadius: 12,
    objectFit: "cover",
    background: "#fff",
    padding: 4,
    boxShadow: "0 4px 12px rgba(2,6,23,.22)",
    flex: "0 0 auto",
  },
  heroEyebrow: { color: "rgba(255,255,255,.78)", fontWeight: 800, letterSpacing: ".6px" },
  heroSub: { color: "rgba(255,255,255,.80)", fontWeight: 700, marginTop: 2 },
  heroChips: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  heroChip: {
    padding: "6px 13px",
    borderRadius: 999,
    background: "rgba(255,255,255,.15)",
    border: "1px solid rgba(255,255,255,.32)",
    color: "#fff",
    fontWeight: 800,
    backdropFilter: "blur(4px)",
  },

  // 📄 document control — the four ISO fields, laid out as a block instead of a
  //    five-column table with two empty cells in it
  docCard: {
    border: "1px solid rgba(15,23,42,.14)",
    borderRadius: 14,
    background: "linear-gradient(180deg,#ffffff,#f0f9ff)",
    padding: "12px 14px 14px",
    marginBottom: 16,
    borderLeft: "4px solid #0891b2",
    boxShadow: "0 4px 12px rgba(2,132,199,.06)",
  },
  docTitleRow: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingBottom: 10,
    marginBottom: 12,
    borderBottom: "1px dashed rgba(15,23,42,.16)",
  },
  docTitleLabel: { color: "#0c4a6e", fontWeight: 800, opacity: .8 },
  docGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 },
  docCell: { display: "flex", flexDirection: "column", gap: 4 },
  docCellLabel: { color: "#0c4a6e", fontWeight: 800, opacity: .8 },
  // 📐 The card fills the page instead of sitting in a 1200px column. Its width
  //    is 100% of the flow, never 100vw, so a side menu keeps its own space.
  containerWrap: { padding: "0 clamp(10px,1.6vw,26px) 28px" },
  container: {
    margin: "0 auto",
    marginTop: -56,
    padding: "clamp(14px,1.8vw,26px)",
    background: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    direction: "ltr",
    boxShadow: "0 12px 32px rgba(2,132,199,.12), 0 1px 2px rgba(2,6,23,.05)",
    border: "1px solid rgba(15,23,42,.14)",
    position: "relative",
    zIndex: 1,
  },
  titleWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  title: { color: "#fff", margin: 0, fontWeight: 900, textShadow: "0 1px 10px rgba(2,6,23,.28)" },
  badge: { background: "#e0f2fe", color: "#0c4a6e", padding: "7px 15px", borderRadius: 999, border: "1px solid rgba(15,23,42,.14)", fontWeight: 800 },
  section: { marginBottom: 16 },
  label: { fontWeight: 800, color: "#0c4a6e" },

  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#071b2d",
    minHeight: 42,
    boxSizing: "border-box",
    transition: "border-color .15s, box-shadow .15s, background .15s",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#071b2d",
    minHeight: 42,
    boxSizing: "border-box",
    transition: "border-color .15s, box-shadow .15s, background .15s",
  },

  focused: { boxShadow: "0 0 0 4px rgba(14,165,233,.20)", border: "1px solid #0284c7" },
  // 🔴 a mandatory box nobody has filled — the border says so before the save does
  invalid: { border: "1px solid #ef4444", background: "#fff7f7", boxShadow: "0 0 0 3px rgba(239,68,68,.12)" },

  fieldset: {
    marginBottom: 18,
    padding: "16px 16px 18px",
    border: "1px solid rgba(15,23,42,.14)",
    borderRadius: 16,
    background: "linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%)",
    boxShadow: "0 4px 12px rgba(2,132,199,.05)",
  },
  legend: { fontWeight: 900, color: "#0c4a6e", padding: "0 8px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginTop: 10 },
  row: { display: "flex", flexDirection: "column", gap: 6 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid rgba(15,23,42,.14)", borderRadius: 14, marginTop: 8 },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: "1px solid #e2e8f0" },
  th: { background: "#0ea5e9", color: "#fff", textAlign: "center", position: "sticky", top: 0, zIndex: 1, padding: "10px 8px", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,.30)", fontWeight: 900 },
  td: { border: "1px solid #e2e8f0", padding: "7px", verticalAlign: "top", background: "#fff" },
  firstColCell: { border: "1px solid #e2e8f0", padding: "8px 10px", fontWeight: 800, background: "#f0f9ff", color: "#0c4a6e", minWidth: 200, whiteSpace: "nowrap" },
  tdInput: { width: "100%", minWidth: 130, display: "block", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 9, outline: "none", background: "#fff", boxSizing: "border-box" },
  addButton: { padding: "9px 16px", background: "linear-gradient(180deg,#0ea5e9,#06b6d4)", color: "#fff", border: "1.5px solid #0284c7", borderRadius: 10, cursor: "pointer", fontWeight: 800, transition: "filter .18s" },
  dangerButton: { padding: "9px 16px", background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", borderRadius: 10, cursor: "pointer", fontWeight: 800, transition: "filter .18s" },
  uploadButton: { padding: "9px 16px", background: "linear-gradient(180deg,#f59e0b,#d97706)", color: "#fff", border: "1.5px solid #b45309", borderRadius: 10, cursor: "pointer", marginBottom: 8, fontWeight: 800 },
  formRow3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 12 },
  saveButton: { padding: "12px 22px", background: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "1.5px solid #15803d", borderRadius: 12, cursor: "pointer", fontWeight: 900, transition: "filter .18s" },
  saveButtonDisabled: { opacity: .5, cursor: "not-allowed" },
  viewButton: { padding: "12px 22px", background: "linear-gradient(180deg,#0ea5e9,#06b6d4)", color: "#fff", border: "1.5px solid #0284c7", borderRadius: 12, cursor: "pointer", fontWeight: 900, transition: "filter .18s" },
  // the save button follows the inspector down a very long form
  actionBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    marginTop: 18,
    padding: "12px clamp(6px,1vw,14px)",
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    background: "rgba(255,255,255,.94)",
    backdropFilter: "blur(6px)",
    borderTop: "1px solid rgba(15,23,42,.14)",
    borderRadius: "0 0 14px 14px",
  },
  toastWrap: { position: "fixed", left: 16, bottom: 16, zIndex: 1000, maxWidth: "92vw" },
  toast: { padding: "11px 17px", borderRadius: 13, boxShadow: "0 6px 18px rgba(0,0,0,.10)", fontWeight: 900, borderWidth: 2, borderStyle: "solid" },
  dialogOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(7,27,45,.24)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" },
  dialogBox: { background: "#fff", padding: "2rem", borderRadius: 18, boxShadow: "0 12px 32px rgba(2,132,199,.20)", width: "min(95vw,350px)", textAlign: "center" },
};

/* ===== Reducers ===== */
const initialGeneralInfo = {
  reportOn: "",
  receivedOn: "",
  inspectionDate: "",
  temperature: "",
  vehicleTemperature: "",
  brand: "",
  invoiceNo: "",
  supplierName: "",
  ph: "",
  origin: "",
  airwayBill: "",
  localLogger: "",
  internationalLogger: "",
  receivingAddress: "",
};
function generalInfoReducer(state, action) {
  switch(action.type) {
    case "SET": return {...state, ...action.payload};
    case "UPDATE": return {...state, [action.field]: action.value};
    case "RESET": return {...initialGeneralInfo};
    default: return state;
  }
}
const initialDocMeta = {
  documentTitle: "Raw Material Inspection Report",
  documentNo: "FS-QM/REC/RMB",
  issueDate: "2020-02-10",
  revisionNo: "0",
  area: "QA",
};
function docMetaReducer(state, action) {
  switch(action.type) {
    case "SET": return {...state, ...action.payload};
    case "UPDATE": return {...state, [action.field]: action.value};
    default: return state;
  }
}

/* ===== Utils ===== */
const uniq = (arr) => Array.from(new Set(arr.map((x) => normStr(x))));
const normCI = (s) => String(normStr(s) ?? "").trim().toLowerCase();

const getLocalTypes = () => {
  try {
    const raw = localStorage.getItem(TYPES_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};
const saveLocalType = (name) => {
  try {
    const arr = uniq([...getLocalTypes(), name]);
    localStorage.setItem(TYPES_LS_KEY, JSON.stringify(arr));
  } catch {}
};

// ✅ Suppliers (server + local fallback)
const SUPPLIERS_LS_KEY = "qcs_suppliers_v1";
const DEFAULT_SUPPLIERS = [];

const getLocalSuppliers = () => {
  try {
    const raw = localStorage.getItem(SUPPLIERS_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const saveLocalSupplier = (name) => {
  try {
    const arr = uniq([...getLocalSuppliers(), name]);
    localStorage.setItem(SUPPLIERS_LS_KEY, JSON.stringify(arr));
  } catch {}
};

// ✅ Brands + Origins — cached the same way suppliers and types are: the server
//    record is the truth, localStorage only keeps the last known list.
const getLocalList = (key) => {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const saveLocalListItem = (key, name) => {
  try {
    localStorage.setItem(key, JSON.stringify(uniq([...getLocalList(key), name])));
  } catch {}
};

/* ═════════════════════════════════════════ Searchable dropdown

   The lists here used to be a "Search…" box sitting ABOVE a native <select>.
   Typing narrowed a list that was collapsed, so nothing visibly happened — and
   a search that excluded the chosen value removed its <option>, which made the
   select render blank as though the value had been cleared.

   This is one control instead of two: type to filter, see the matches while you
   type, click (or Enter) to pick. The chosen value is shown when it is closed
   and is never dropped by a search. */
function SearchableSelect({
  value = "",
  options,
  onPick,
  placeholder = "-- Select --",
  emptyText = "No matches",
  invalid = false,
  decorate,
  disabled = false,
  baseStyle,
  focusStyle,
  invalidStyle,
  maxRendered = 300,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  // clicking anywhere else puts the list away
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const list = useMemo(() => {
    const needle = normCI(q);
    const arr = Array.isArray(options) ? options : [];
    return needle ? arr.filter((o) => normCI(o).includes(needle)) : arr;
  }, [options, q]);

  useEffect(() => { setActive(0); }, [q, open]);

  // keep the highlighted row in view while arrowing through a long list
  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.children[active];
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const commit = (opt) => {
    onPick(opt);
    setQ("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && list[active] !== undefined) {
        e.preventDefault();
        commit(list[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const shown = list.slice(0, maxRendered);

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      <input
        value={open ? q : value}
        disabled={disabled}
        placeholder={value && !open ? value : placeholder}
        onFocus={() => { setFocused(true); setQ(""); setOpen(true); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        onClick={() => setOpen(true)}
        title={value || placeholder}
        style={{
          ...baseStyle,
          ...(focused ? focusStyle : {}),
          ...(invalid ? invalidStyle : {}),
          paddingInlineEnd: value ? 60 : 34,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />

      {/* clear + open affordances */}
      <div style={{ position: "absolute", insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4, alignItems: "center", pointerEvents: disabled ? "none" : "auto" }}>
        {value ? (
          <button
            type="button"
            title="Clear"
            aria-label="Clear"
            onClick={() => { onPick(""); setQ(""); setOpen(false); }}
            style={{ border: "none", background: "transparent", color: "#94a3b8", fontWeight: 900, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
          >
            ✕
          </button>
        ) : null}
        <span onClick={() => !disabled && setOpen((v) => !v)} style={{ color: "#0c4a6e", opacity: .65, cursor: "pointer", lineHeight: 1 }}>▾</span>
      </div>

      {open && !disabled ? (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 4px)",
            insetInlineStart: 0,
            width: "100%",
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid rgba(15,23,42,.16)",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(2,132,199,.16)",
          }}
        >
          {shown.length ? (
            shown.map((opt, i) => {
              const d = decorate ? decorate(opt) : null;
              return (
                <div
                  key={opt}
                  role="option"
                  aria-selected={opt === value}
                  title={d?.title || opt}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(opt)}
                  style={{
                    padding: "8px 11px",
                    cursor: "pointer",
                    fontWeight: opt === value ? 900 : 700,
                    color: "#0c4a6e",
                    background: i === active ? "#e0f2fe" : "transparent",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  {d?.label ?? opt}
                </div>
              );
            })
          ) : (
            <div style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>{emptyText}</div>
          )}
          {list.length > shown.length ? (
            <div style={{ padding: "8px 12px", color: "#94a3b8", fontWeight: 700 }}>
              … {list.length - shown.length} أكثر — تابع الكتابة للتصفية
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ===== Confirm Dialog ===== */
function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={styles.dialogOverlay}>
      <div style={styles.dialogBox}>
        <div style={{marginBottom:20,fontWeight:800,fontSize:"1.12rem"}}>{message}</div>
        <div style={{display:"flex",justifyContent:"center",gap:18}}>
          <button style={styles.saveButton} onClick={onConfirm}>نعم</button>
          {/* NOT a delete action: globals.css hides [data-delete-action], which
              was hiding the only way to cancel a confirmation — including the
              save confirmation. */}
          <button style={styles.dangerButton} onClick={onCancel}>لا</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Loader ===== */
function Loader({ show, text="جار التنفيذ..." }) {
  if (!show) return null;
  return (
    <div style={styles.dialogOverlay}>
      <div style={{...styles.dialogBox, width:200}}>
        <div className="loader" style={{marginBottom:14}}>
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="16" fill="none" stroke="#0ea5e9" strokeWidth="5" opacity=".2"/>
            <circle cx="19" cy="19" r="16" fill="none" stroke="#0ea5e9" strokeWidth="5" strokeDasharray="80" strokeDashoffset="60">
              <animateTransform attributeName="transform" type="rotate" from="0 19 19" to="360 19 19" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <div style={{fontWeight:700,fontSize:"1.07rem"}}>{text}</div>
      </div>
    </div>
  );
}

/* ===== Main ===== */
export default function QCSRawMaterialForm() {
  const navigate = useNavigate();
  const imagesInputRef = useRef(null);
  const certificateInputRef = useRef(null);

  const [generalInfo, dispatchGeneralInfo] = useReducer(generalInfoReducer, initialGeneralInfo);
  const [docMeta, dispatchDocMeta] = useReducer(docMetaReducer, initialDocMeta);

  const [samples, setSamples] = useState([makeNewSample()]);

  // ⏳ Shelf life: most products keep for a fixed number of days, so the expiry
  //    date is calculated from the slaughter/production date instead of typed.
  const shelf = useShelfLife();
  const resolveShelf = shelf.resolve;
  const [shelfOpen, setShelfOpen] = useState(false);
  // sample id → the expiry WE wrote. If the cell still holds it, it is ours to
  //   recalculate; the moment the inspector types something else it is theirs.
  const autoExpiryRef = useRef(new Map());
  // …and the mirror of it: a production date WE derived from an expiry date.
  const autoProductionRef = useRef(new Map());

  // ✅ Shipment type + search + add with disable
  const [shipmentType, setShipmentType] = useState("");
  const [shipmentTypes, setShipmentTypes] = useState(DEFAULT_TYPES);
  const [newType, setNewType] = useState("");           // Add input

  // ✅ Suppliers dropdown + search + add with disable
  const [supplierOptions, setSupplierOptions] = useState(DEFAULT_SUPPLIERS);
  // ✅ which suppliers the HACCP/ISO evaluation pages have actually judged
  const { statusOf: supplierStatusOf } = useSupplierEvaluations();
  const [newSupplier, setNewSupplier] = useState("");

  // 🏷️ Brand list (server meta + local cache)
  const [brandOptions, setBrandOptions] = useState([]);
  const [newBrand, setNewBrand] = useState("");

  // 🌍 Origin list — seeded from the product catalog's own origin column, then
  //    whatever QC has added on top of it.
  const [originOptions, setOriginOptions] = useState(FALLBACK_ORIGINS);
  const [newOrigin, setNewOrigin] = useState("");

  const [shipmentStatus, setShipmentStatus] = useState("Acceptable");
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [averageWeight, setAverageWeight] = useState("");
  const [isFocusedName, setIsFocusedName] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [images, setImages] = useState([]);
  const [notes, setNotes] = useState("");
  const [productLines, setProductLines] = useState([makeEmptyLine()]);
  const [createdDate, setCreatedDate] = useState(toYMD(todayIso()));
  const [entrySequence, setEntrySequence] = useState(1);
  const [entryKey, setEntryKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [toast, setToast] = useState({ type: null, msg: "" });
  const [saveMsg, setSaveMsg] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({open:false,type:"",onOk:null});
  const saveLockRef = useRef(false);
  const lastSaveTsRef = useRef(0);

  function makeNewSample() {
    // productCode ⟷ productName: bound to the shared product catalog so the
    // Product Traceability system can follow this shipment by its item code.
    const s = { id: makeStableId(), productCode: "", productName: "" };
    ATTRIBUTES.forEach(a => s[a.key] = a.default);
    return s;
  }
  function makeEmptyLine() {
    return { id: makeStableId(), code: "", name: "", qty: "", weight: "" };
  }
  function sanitizeNum(v) {
    const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function avgOf(arr) {
    const nums = arr.map(v => {
      const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }).filter(n => n !== null);
    if (!nums.length) return "";
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return avg.toFixed(2);
  }

  // The products actually inspected in the sample columns — the only choices a
  // product line may carry. Keyed by code+name so a sample with no code yet
  // still has a stable option value.
  const lineKeyOf = (r) => (r?.code || r?.name ? `${r.code || ""}||${r.name || ""}` : "");
  const sampleProducts = useMemo(() => {
    const seen = new Map();
    samples.forEach((s) => {
      const code = String(s.productCode || "").trim();
      const name = String(s.productName || "").trim();
      if (!code && !name) return;
      const key = `${code}||${name}`;
      if (!seen.has(key)) seen.set(key, { key, code, name });
    });
    return Array.from(seen.values());
  }, [samples]);

  // Keep the lines honest about what the samples say. Editing a sample's name
  // re-labels the line that is bound to the same code; a line whose product
  // left the sample columns entirely is cleared, so a shipment can never claim
  // a product it never tested.
  useEffect(() => {
    setProductLines((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        const key = lineKeyOf(r);
        if (!key || sampleProducts.some((sp) => sp.key === key)) return r;
        const byCode = r.code && sampleProducts.find((sp) => sp.code === r.code);
        changed = true;
        return byCode ? { ...r, code: byCode.code, name: byCode.name } : { ...r, code: "", name: "" };
      });
      return changed ? next : prev;
    });
  }, [sampleProducts]);

  const totalQtyCalc = useMemo(() => productLines.reduce((acc, r) => acc + sanitizeNum(r.qty), 0), [productLines]);
  const totalWeightCalc = useMemo(() => productLines.reduce((acc, r) => acc + sanitizeNum(r.weight), 0), [productLines]);
  const avgTemp = useMemo(() => avgOf(samples.map((s) => s.temperature)), [samples]);
  const avgPh = useMemo(() => avgOf(samples.map((s) => s.ph)), [samples]);

  useEffect(() => {
    setTotalQuantity(totalQtyCalc > 0 ? String(totalQtyCalc) : "");
    setTotalWeight(totalWeightCalc > 0 ? String(totalWeightCalc) : "");
  }, [totalQtyCalc, totalWeightCalc]);

  useEffect(() => {
    dispatchGeneralInfo({
      type: "SET",
      payload: { temperature: avgTemp, ph: avgPh }
    });
  }, [avgTemp, avgPh]);

  useEffect(() => {
    const base = "Raw Material Inspection Report";
    dispatchDocMeta({ type: "UPDATE", field: "documentTitle", value: shipmentType ? `${base} - ${shipmentType}` : base });
  }, [shipmentType]);

  useEffect(() => {
    const q = parseFloat(totalQuantity);
    const w = parseFloat(totalWeight);
    setAverageWeight(q > 0 && w > 0 ? (w / q).toFixed(3) : "");
  }, [totalQuantity, totalWeight]);

  // Shipment Types (server + local)
  useEffect(() => {
    (async () => {
      try {
        const serverList = (await listReportsByType("qcs_shipment_type"))
          .map((r) => normStr(r?.payload?.name))
          .filter(Boolean);
        setShipmentTypes(uniq([...DEFAULT_TYPES, ...serverList, ...getLocalTypes()]));
      } catch {
        setShipmentTypes(uniq([...DEFAULT_TYPES, ...getLocalTypes()]));
      }
    })();
  }, []);

  // ✅ Disable Add Type if empty OR exists
  const newTypeNorm = normStr(newType);
  const typeExists = useMemo(() => {
    if (!newTypeNorm) return false;
    const k = normCI(newTypeNorm);
    return shipmentTypes.some((t) => normCI(t) === k);
  }, [shipmentTypes, newTypeNorm]);
  const disableAddType = !newTypeNorm || typeExists;

  // Suppliers
  useEffect(() => {
    (async () => {
      try {
        const serverList = (await listReportsByType("qcs_supplier"))
          .map((r) => normStr(r?.payload?.name))
          .filter(Boolean);

        setSupplierOptions(uniq([...DEFAULT_SUPPLIERS, ...serverList, ...getLocalSuppliers()]));
      } catch {
        setSupplierOptions(uniq([...DEFAULT_SUPPLIERS, ...getLocalSuppliers()]));
      }
    })();
  }, []);

  // Brands: one meta record per brand, exactly like qcs_supplier.
  useEffect(() => {
    (async () => {
      let server = [];
      try {
        server = (await listReportsByType("qcs_brand"))
          .map((r) => normStr(r?.payload?.name))
          .filter(Boolean);
      } catch {
        /* offline — the local cache below still answers */
      }
      setBrandOptions(uniq([...server, ...getLocalList(BRANDS_LS_KEY)]));
    })();
  }, []);

  // Origins: the catalog already knows every origin the company buys from, so
  // the list starts there instead of asking QC to type them in again.
  useEffect(() => {
    (async () => {
      let fromCatalog = [];
      try {
        const rows = await fetchBaseItems();
        fromCatalog = (Array.isArray(rows) ? rows : [])
          .map((it) => normStr(it?.origin))
          .filter(Boolean);
      } catch {
        /* items.json missing — FALLBACK_ORIGINS still covers the usual list */
      }
      let server = [];
      try {
        server = (await listReportsByType("qcs_origin"))
          .map((r) => normStr(r?.payload?.name))
          .filter(Boolean);
      } catch {
        /* offline */
      }
      setOriginOptions(
        uniq([...FALLBACK_ORIGINS, ...fromCatalog, ...server, ...getLocalList(ORIGINS_LS_KEY)])
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      );
    })();
  }, []);

  const newSupplierNorm = normStr(newSupplier);
  const supplierExists = useMemo(() => {
    if (!newSupplierNorm) return false;
    const k = normCI(newSupplierNorm);
    return supplierOptions.some((s) => normCI(s) === k);
  }, [supplierOptions, newSupplierNorm]);
  const disableAddSupplier = !newSupplierNorm || supplierExists;

  const newBrandNorm = normStr(newBrand);
  const brandExists = useMemo(() => {
    if (!newBrandNorm) return false;
    const k = normCI(newBrandNorm);
    return brandOptions.some((b) => normCI(b) === k);
  }, [brandOptions, newBrandNorm]);
  const disableAddBrand = !newBrandNorm || brandExists;

  const newOriginNorm = normStr(newOrigin);
  const originExists = useMemo(() => {
    if (!newOriginNorm) return false;
    const k = normCI(newOriginNorm);
    return originOptions.some((o) => normCI(o) === k);
  }, [originOptions, newOriginNorm]);
  const disableAddOrigin = !newOriginNorm || originExists;

  useEffect(() => {
    let stop = false;
    const recalc = async () => {
      const idOk = (generalInfo.invoiceNo || "").trim() !== "";
      if (!shipmentType || !idOk || !createdDate) {
        setEntrySequence(1);
        setEntryKey("");
        return;
      }
      try {
        const { uniqueKey, sequence } = await deriveUniqueKey({
          shipmentType,
          airwayBill: "",
          invoiceNo: generalInfo.invoiceNo,
          createdDate,
        });
        if (!stop) { setEntrySequence(sequence); setEntryKey(uniqueKey); }
      } catch {
        if (!stop) { setEntrySequence(1); setEntryKey(""); }
      }
    };
    // ⏱️ every keystroke in Invoice No used to pull the whole qcs_raw_material
    //    table down to count the day's entries — a few hundred keystrokes a
    //    shift, and a fast route to a 429. One lookup once typing settles.
    const t = window.setTimeout(recalc, 500);
    return () => { stop = true; window.clearTimeout(t); };
  }, [shipmentType, generalInfo.invoiceNo, createdDate]);

  /* 🔴 Mandatory-but-empty boxes carry a red border from the start, so the
     inspector sees what is still owed before pressing Save instead of after. */
  const missing = useMemo(() => {
    const out = new Set();
    REQUIRED_FIELDS.forEach((f) => {
      const v =
        f === "inspectedBy" ? inspectedBy :
        f === "verifiedBy" ? verifiedBy :
        generalInfo[f];
      if (!String(v ?? "").trim()) out.add(f);
    });
    if (!String(shipmentType ?? "").trim()) out.add("shipmentType");
    if (!String(createdDate ?? "").trim()) out.add("createdDate");

    // the sample columns carry mandatory cells of their own
    if (samples.some((s) => !String(s.productName || "").trim())) out.add("sampleProduct");
    if (samples.some((s) => !isoDatesIn(s.slaughterDate).length)) out.add("slaughterDate");
    if (samples.some((s) => !isoDatesIn(s.expiryDate).length)) out.add("expiryDate");
    if (productLines.some((l) => !String(l.name || "").trim())) out.add("lineProduct");

    return out;
  }, [generalInfo, inspectedBy, verifiedBy, shipmentType, createdDate, samples, productLines]);

  /* every SearchableSelect on the page wears the same skin */
  const pickerSkin = {
    baseStyle: styles.select,
    focusStyle: styles.focused,
    invalidStyle: styles.invalid,
  };

  const inputProps = (name, bad = false) => ({
    onFocus: () => setIsFocusedName(name),
    onBlur: () => setIsFocusedName(null),
    style: {
      ...styles.input,
      ...(isFocusedName === name ? styles.focused : {}),
      ...(bad ? styles.invalid : {}),
    },
  });
  const selectProps = (name, bad = false) => ({
    onFocus: () => setIsFocusedName(name),
    onBlur: () => setIsFocusedName(null),
    style: {
      ...styles.select,
      ...(isFocusedName === name ? styles.focused : {}),
      ...(bad ? styles.invalid : {}),
    },
  });

  function showToast(type, msg) {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ type: null, msg: "" }), 2500);
  }
  function toastColors(type) {
    return type === "success"
      ? { bg: "#ecfdf5", fg: "#065f46", bd: "#34d399" }
      : type === "error"
        ? { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5" }
        : { bg: "#e0f2fe", fg: "#0c4a6e", bd: "#7dd3fc" };
  }

  function openConfirm(type, message, onOk) {
    setConfirmDialog({ open:true, type, message, onOk });
  }
  function closeConfirm() {
    setConfirmDialog({ open:false });
  }

  function setSampleValue(index, key, value) {
    setSamples((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }
  // Code and name always move together, so they are written in one update.
  function setSampleProduct(index, { code, name }) {
    setSamples((prev) =>
      prev.map((s, i) => (i === index ? { ...s, productCode: code, productName: name } : s))
    );
  }
  /* ⏳ The two dates and the shelf life are three sides of one sum, so the sheet
     fills in whichever side is missing — in either direction:

        production + shelf life = expiry     (the carton carries a slaughter date)
        expiry − shelf life = production     (the carton carries only an expiry)

     A cell is written only when it is empty or still holds exactly what we last
     wrote there, so a date typed by hand is never overwritten. Clearing the
     expiry also clears a production date that was derived from it. */
  useEffect(() => {
    setSamples((prev) => {
      let changed = false;
      const next = prev.map((s) => {
        const info = resolveShelf({ code: s.productCode, name: s.productName });
        if (!info || !(info.days > 0)) return s;

        const production = String(s.slaughterDate || "").trim();
        const expiry = String(s.expiryDate || "").trim();
        const hasProduction = isoDatesIn(production).length > 0;
        const hasExpiry = isoDatesIn(expiry).length > 0;
        const ourProduction = autoProductionRef.current.get(s.id);
        const ourExpiry = autoExpiryRef.current.get(s.id);

        if (hasProduction) {
          // the production date is one we derived, and its expiry is gone
          if (production === ourProduction && !hasExpiry) {
            autoProductionRef.current.delete(s.id);
            changed = true;
            return { ...s, slaughterDate: "" };
          }
          const want = expiryFromProduction(production, info.days);
          if (!want || want === expiry) return s;
          if (expiry && expiry !== ourExpiry) return s; // typed by hand
          autoExpiryRef.current.set(s.id, want);
          changed = true;
          return { ...s, expiryDate: want };
        }

        if (hasExpiry) {
          const want = productionFromExpiry(expiry, info.days);
          if (!want || want === production) return s;
          if (production && production !== ourProduction) return s; // typed by hand
          autoProductionRef.current.set(s.id, want);
          changed = true;
          return { ...s, slaughterDate: want };
        }

        return s;
      });
      return changed ? next : prev;
    });
  }, [samples, resolveShelf]);

  /** Force the calculated expiry onto one sample, replacing what is there. */
  function applyShelfLife(index) {
    setSamples((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const info = resolveShelf({ code: s.productCode, name: s.productName });
      const want = info && info.days > 0 ? expiryFromProduction(s.slaughterDate, info.days) : "";
      if (!want) return s;
      autoExpiryRef.current.set(s.id, want);
      return { ...s, expiryDate: want };
    }));
  }

  /** The other direction: back-date the production cell from the expiry. */
  function applyReverseShelfLife(index) {
    setSamples((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const info = resolveShelf({ code: s.productCode, name: s.productName });
      const want = info && info.days > 0 ? productionFromExpiry(s.expiryDate, info.days) : "";
      if (!want) return s;
      autoProductionRef.current.set(s.id, want);
      return { ...s, slaughterDate: want };
    }));
  }

  /** The line under an expiry cell: what the shelf life has to say about it. */
  function expiryHint(i) {
    const s = samples[i];
    const info = resolveShelf({ code: s.productCode, name: s.productName });
    if (!info || !(info.days > 0)) return null;
    const want = expiryFromProduction(s.slaughterDate, info.days);
    if (!want) {
      return <span className="qs-hint" style={{ color: "#64748b", fontWeight: 700 }}>⏳ {info.days}d — needs a production or expiry date</span>;
    }
    if (String(s.expiryDate || "").trim() === want) {
      return <span className="qs-hint" style={{ color: "#15803d", fontWeight: 800 }} title={`Shelf life ${info.days} days (${info.source})`}>⏳ auto +{info.days}d</span>;
    }
    return (
      <button
        type="button"
        onClick={() => applyShelfLife(i)}
        title={`Overwrite with production date + ${info.days} days`}
        className="qs-hint"
        style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #fcd34d", background: "#fffbeb", color: "#b45309", fontWeight: 800, cursor: "pointer" }}
      >
        ↻ +{info.days}d
      </button>
    );
  }

  /** The line under a production cell: what the expiry date implies about it. */
  function productionHint(i) {
    const s = samples[i];
    const info = resolveShelf({ code: s.productCode, name: s.productName });
    if (!info || !(info.days > 0)) return null;
    if (!isoDatesIn(s.expiryDate).length) return null;
    const want = productionFromExpiry(s.expiryDate, info.days);
    if (!want) return null;
    if (String(s.slaughterDate || "").trim() === want) {
      return (
        <span className="qs-hint" style={{ color: "#15803d", fontWeight: 800 }} title={`Expiry − shelf life ${info.days} days (${info.source})`}>
          ⏳ auto −{info.days}d
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => applyReverseShelfLife(i)}
        title={`Overwrite with expiry date − ${info.days} days`}
        className="qs-hint"
        style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #fcd34d", background: "#fffbeb", color: "#b45309", fontWeight: 800, cursor: "pointer" }}
      >
        ↻ −{info.days}d
      </button>
    );
  }

  function addSample() { setSamples((prev) => [...prev, makeNewSample()]); }
  function removeSample() { if (samples.length > 1) setSamples((prev) => prev.slice(0, -1)); }

  function handleGeneralChange(field, value) {
    dispatchGeneralInfo({ type: "UPDATE", field, value });
  }

  function handleImagesUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploadingImages(true);
    Promise.all(files.map(f => uploadImageToServer(f, "qcs_raw_images").catch(() => null)))
      .then(uploaded => {
        const valid = uploaded.filter(Boolean);
        if (valid.length) {
          setImages(prev => {
            const setPrev = new Set(prev);
            const toAdd = valid.filter(u => !setPrev.has(u));
            return toAdd.length ? [...prev, ...toAdd] : prev;
          });
          showToast("success", `تم رفع ${valid.length} صورة.`);
        } else {
          showToast("error", "جميع عمليات الرفع فشلت.");
        }
      }).finally(() => {
        setIsUploadingImages(false);
        if (imagesInputRef.current) imagesInputRef.current.value = "";
      });
  }
  function triggerImagesSelect() { imagesInputRef.current?.click(); }

  /* 📜 Halal certificate. The View page can already show, replace and delete it,
     and the payload has carried certificateUrl/certificateName all along — the
     input form simply had no control to attach one, so it could only ever be
     added after the fact from the admin screen. Images and PDFs, same upload
     route the View page uses. */
  function triggerCertificateSelect() { certificateInputRef.current?.click(); }

  function handleCertificateUpload(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    const ok = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!ok) {
      showToast("error", "الشهادة يجب أن تكون صورة أو ملف PDF.");
      return;
    }

    const previous = certificateUrl;
    setIsUploadingCert(true);
    uploadImageToServer(file, "qcs_certificate")
      .then(async (url) => {
        setCertificateUrl(url);
        setCertificateName(file.name);
        // the replaced file is nobody's now — drop it instead of orphaning it
        if (previous && previous !== url) {
          try { await deleteImage(previous); } catch { /* keep the new one anyway */ }
        }
        showToast("success", "تم رفع شهادة الحلال.");
      })
      .catch((err) => showToast("error", `فشل رفع الشهادة: ${err?.message || err}`))
      .finally(() => setIsUploadingCert(false));
  }

  function handleDeleteCertificate() {
    openConfirm("deleteCert", "هل تريد حذف شهادة الحلال؟", async () => {
      setConfirmDialog({ open:false });
      setIsSaving(true);
      try {
        await deleteImage(certificateUrl);
      } catch (err) {
        console.warn("Storage delete failed; unlinking anyway.", err);
      }
      setCertificateUrl("");
      setCertificateName("");
      showToast("success", "تم حذف الشهادة.");
      setIsSaving(false);
    });
  }

  function handleRemoveImage(index) {
    openConfirm("deleteImg", "هل تريد حذف هذه الصورة؟", async () => {
      setConfirmDialog({ open:false });
      setIsSaving(true);
      const url = images[index];
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Storage delete failed; unlinking anyway.", err);
      }
      setImages(prev => prev.filter((_,i)=>i!==index));
      showToast("success", "تم حذف الصورة.");
      setIsSaving(false);
    });
  }

  function buildReportPayload(extra) {
    return {
      clientId: makeClientId(),
      date: new Date().toISOString(),
      shipmentType,
      status: shipmentStatus,
      generalInfo,
      samples,
      inspectedBy,
      verifiedBy,
      totalQuantity,
      totalWeight,
      averageWeight,
      productLines,
      images,
      certificateUrl,
      certificateName,
      docMeta,
      notes,
      ...extra,
    };
  }

  function updateLine(id, field, value) {
    setProductLines(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function updateLineProduct(id, { code, name }) {
    setProductLines(prev => prev.map(r => r.id === id ? { ...r, code, name } : r));
  }
  // A product line is one of the products inspected in the sample columns, so
  // its dropdown is fed from those columns — nothing else can be chosen.
  function pickLineProduct(id, key) {
    const hit = sampleProducts.find((sp) => sp.key === key);
    setProductLines(prev =>
      prev.map(r => (r.id === id ? { ...r, code: hit?.code ?? "", name: hit?.name ?? "" } : r))
    );
  }
  function addLine() { setProductLines(prev => [...prev, makeEmptyLine()]); }
  function removeLine(id) { if (productLines.length > 1) setProductLines(prev => prev.filter(r => r.id !== id)); }

  // ✅ Shipment Type: Add with disable + if exists just select
  function handleAddType() {
    const name = normStr(newType);
    if (!name) return;

    const existing = shipmentTypes.find((t) => normCI(t) === normCI(name));
    if (existing) {
      setShipmentType(existing);
      setNewType("");
      return;
    }

    postMeta("qcs_shipment_type", { name }).then(() => {
      setShipmentTypes(prev => uniq([...prev, name]));
      setShipmentType(name);
      setNewType("");
      saveLocalType(name);
      showToast("success", "تم حفظ نوع الشحنة على السيرفر.");
    }).catch(() => {
      saveLocalType(name);
      setShipmentTypes(prev => uniq([...prev, name]));
      setShipmentType(name);
      setNewType("");
      showToast("error", "تعذر الوصول للسيرفر، تم الحفظ محلياً.");
    });
  }

  // ✅ Add Supplier
  function handleAddSupplier() {
    const name = normStr(newSupplier);
    if (!name) return;

    const existing = supplierOptions.find((s) => normCI(s) === normCI(name));
    if (existing) {
      handleGeneralChange("supplierName", existing);
      setNewSupplier("");
      return;
    }

    postMeta("qcs_supplier", { name })
      .then(() => {
        setSupplierOptions((prev) => uniq([...prev, name]));
        handleGeneralChange("supplierName", name);
        setNewSupplier("");
        saveLocalSupplier(name);
        showToast("success", "تم حفظ اسم المورد على السيرفر.");
      })
      .catch(() => {
        saveLocalSupplier(name);
        setSupplierOptions((prev) => uniq([...prev, name]));
        handleGeneralChange("supplierName", name);
        setNewSupplier("");
        showToast("error", "تعذر الوصول للسيرفر، تم الحفظ محلياً.");
      });
  }

  /* Brand and Origin behave exactly like the supplier list: pick the entry when
     it already exists, otherwise store it on the server and keep a local copy
     so the dropdown still has it when the server cannot be reached. */
  function addListValue({ metaType, cacheKey, options, setOptions, value, clear, field, label }) {
    const name = normStr(value);
    if (!name) return;

    const existing = options.find((o) => normCI(o) === normCI(name));
    if (existing) {
      handleGeneralChange(field, existing);
      clear();
      return;
    }

    postMeta(metaType, { name })
      .then(() => {
        setOptions((prev) => uniq([...prev, name]));
        handleGeneralChange(field, name);
        clear();
        saveLocalListItem(cacheKey, name);
        showToast("success", `تم حفظ ${label} على السيرفر.`);
      })
      .catch(() => {
        saveLocalListItem(cacheKey, name);
        setOptions((prev) => uniq([...prev, name]));
        handleGeneralChange(field, name);
        clear();
        showToast("error", "تعذر الوصول للسيرفر، تم الحفظ محلياً.");
      });
  }

  const handleAddBrand = () =>
    addListValue({
      metaType: "qcs_brand",
      cacheKey: BRANDS_LS_KEY,
      options: brandOptions,
      setOptions: setBrandOptions,
      value: newBrand,
      clear: () => setNewBrand(""),
      field: "brand",
      label: "الماركة",
    });

  const handleAddOrigin = () =>
    addListValue({
      metaType: "qcs_origin",
      cacheKey: ORIGINS_LS_KEY,
      options: originOptions,
      setOptions: setOriginOptions,
      value: newOrigin,
      clear: () => setNewOrigin(""),
      field: "origin",
      label: "بلد المنشأ",
    });

  function validateBeforeSave() {
    // the red borders and this check read the same set, so nothing can be
    // rejected on a field the form never marked
    if (missing.size) {
      const names = [...missing].map((f) => REQUIRED_LABELS[f] || f);
      showToast("error", `حقول إلزامية ناقصة (${names.length}): ${names.slice(0, 3).join("، ")}${names.length > 3 ? " …" : ""}`);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* older browsers */ }
      return false;
    }

    if (isUploadingImages || isUploadingCert) {
      showToast("error", "يرجى انتظار انتهاء رفع الملفات قبل الحفظ.");
      return false;
    }
    return true;
  }

  /* A save always POSTs a NEW record (the payload carries no _id), so a screen
     that still holds the shipment it just stored is one click away from saving
     it twice. After a successful save the entry is therefore cleared and a fresh
     one starts.

     What stays: the document header, the report date, and the two signature
     names — those are the same for every shipment of the day. Everything that
     describes the shipment itself goes. Uploaded pictures are only dropped from
     the screen, never deleted: they belong to the report that was just saved. */
  function startNewEntry() {
    dispatchGeneralInfo({ type: "RESET" });
    setSamples([makeNewSample()]);
    setProductLines([makeEmptyLine()]);
    setShipmentType("");
    setShipmentStatus("Acceptable");
    setNotes("");
    setImages([]);
    setCertificateUrl("");
    setCertificateName("");
    setTotalQuantity("");
    setTotalWeight("");
    setAverageWeight("");
    setNewSupplier("");
    setNewType("");
    setNewBrand("");
    setNewOrigin("");
    setEntryKey("");
    setEntrySequence(1);
    autoExpiryRef.current = new Map();
    autoProductionRef.current = new Map();
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* older browsers */ }
  }

  function handleSave() {
    if (saveLockRef.current) return;
    const now = Date.now();
    if (now - lastSaveTsRef.current < SAVE_COOLDOWN_MS) return;
    if (isSaving) return;
    if (!validateBeforeSave()) return;

    openConfirm("save", "تأكيد الحفظ على السيرفر الخارجي؟", async () => {
      setConfirmDialog({ open:false });
      setIsSaving(true);

      const createdAt = todayIso();
      const userDate = toYMD(createdDate);

      const idPart = normStr(generalInfo.invoiceNo || "NA");
      const typePart = normStr(shipmentType || "NA");
      const baseKey = `${userDate}__${typePart}__${idPart}`;
      const sequence = entrySequence || 1;
      const uniqueKey = entryKey || (sequence > 1 ? `${baseKey}-${sequence}` : baseKey);

      try {
        saveLockRef.current = true;
        setSaveMsg("جارٍ الحفظ...");
        showToast("info", "جارٍ الحفظ...");
        await sendToServer(
          buildReportPayload({ createdAt, createdDate: userDate, uniqueKey, sequence })
        );
        setSaveMsg("تم الحفظ — تقرير جديد جاهز");
        showToast("success", `تم الحفظ ✅ (${ymdToDMY(userDate)} · #${sequence}) — تقرير جديد جاهز`);
        lastSaveTsRef.current = Date.now();
        startNewEntry();
      } catch (e) {
        const msg = `فشل الحفظ: ${e?.message || e}`;
        setSaveMsg(msg);
        showToast("error", msg);
      } finally {
        setIsSaving(false);
        saveLockRef.current = false;
        window.clearTimeout(handleSave._t);
        handleSave._t = window.setTimeout(() => setSaveMsg(""), 2500);
      }
    });
  }

  /* === Render === */
  return (
    <div style={styles.page} className="qcsShip">
      <style>{SCOPED_CSS}</style>
      <Loader show={isSaving || isUploadingImages || isUploadingCert} text="جار التنفيذ..." />
      <ShelfLifeModal
        open={shelfOpen}
        config={shelf.config}
        onSave={shelf.save}
        onClose={() => setShelfOpen(false)}
        user={getReporter()}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onOk}
        onCancel={closeConfirm}
      />

      {/* ═════════ Report header ═════════
          A document-control header instead of a naked gradient bar: who the
          document belongs to, what it is called, and the four control fields
          (No / Issue / Revision / Area) that every ISO form carries — all still
          editable and still saved under docMeta, so the View page, the Excel
          backup and the PDF read exactly what they always did. */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroIdentity}>
            <img src={mawashiLogo} alt="Al Mawashi" style={styles.heroLogo} />
            <div>
              <div className="qs-chip" style={styles.heroEyebrow}>
                AL MAWASHI · TRANS EMIRATES LIVESTOCK TRADING L.L.C
              </div>
              <h2 style={styles.title} className="qs-title">📦 QCS Incoming Shipments Report</h2>
              <div className="qs-chip" style={styles.heroSub}>
                تقرير فحص الشحنات الواردة — Quality Control Section
              </div>
            </div>
          </div>

          <div style={styles.heroChips}>
            <span style={styles.heroChip} className="qs-chip">
              💾 Manual Save{saveMsg ? <b> · {saveMsg}</b> : null}
            </span>
            <span
              className="qs-chip"
              title={missing.size ? [...missing].map((f) => REQUIRED_LABELS[f] || f).join("، ") : "كل الحقول الإلزامية مكتملة"}
              style={{
                ...styles.heroChip,
                background: missing.size ? "rgba(239,68,68,.92)" : "rgba(22,163,74,.92)",
                borderColor: missing.size ? "rgba(254,202,202,.7)" : "rgba(187,247,208,.7)",
              }}
            >
              {missing.size ? `🔴 ${missing.size} حقل إلزامي ناقص` : "✅ الحقول الإلزامية مكتملة"}
            </span>
            <span style={styles.heroChip} className="qs-chip">
              📅 {ymdToDMY(createdDate)} · #{entrySequence}
            </span>
            <span style={styles.heroChip} className="qs-chip" title={entryKey || "سيظهر الرقم بعد إدخال Shipment Type و Invoice"}>
              {entryKey ? `🔑 ${entryKey}` : "🔑 بانتظار Shipment Type + Invoice"}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.containerWrap}>
        <div style={styles.container}>

          {/* Document control */}
          <div style={styles.docCard}>
            <div style={styles.docTitleRow}>
              <span style={styles.docTitleLabel} className="qs-label">Document Title</span>
              <input
                {...inputProps("documentTitle")}
                style={{ ...inputProps("documentTitle").style, fontWeight: 800, border: "none", background: "transparent", boxShadow: "none", padding: "4px 0", minHeight: 32 }}
                value={docMeta.documentTitle}
                onChange={(e) => dispatchDocMeta({ type: "UPDATE", field: "documentTitle", value: e.target.value })}
              />
            </div>

            <div style={styles.docGrid}>
              {[
                ["Document No", "documentNo", "text"],
                ["Issue Date", "issueDate", "date"],
                ["Revision No", "revisionNo", "text"],
                ["Area", "area", "text"],
              ].map(([label, field, type]) => (
                <div key={field} style={styles.docCell}>
                  <span style={styles.docCellLabel} className="qs-label">{label}</span>
                  <input
                    type={type === "date" ? "date" : "text"}
                    {...inputProps(field)}
                    style={{ ...inputProps(field).style, minHeight: 38, background: "#fff" }}
                    value={docMeta[field]}
                    onChange={(e) => dispatchDocMeta({ type: "UPDATE", field, value: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Entry Date + Sequence */}
          <div style={styles.section}>
            <label style={styles.label} className="qs-label">Entry Date &amp; Daily No. *</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
              <input
                type="date"
                value={createdDate}
                onChange={(e) => setCreatedDate(e.target.value)}
                {...inputProps("createdDate", missing.has("createdDate"))}
                style={{ ...inputProps("createdDate", missing.has("createdDate")).style, maxWidth: 240 }}
                required
              />
              <div title="Daily auto-number" style={{ padding: "10px 14px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 999, fontWeight: 800, background: "#e0f2fe", color: "#0c4a6e" }}>
                {ymdToDMY(createdDate)} <span style={{ opacity: .7 }}>#</span>{entrySequence}
              </div>
            </div>
          </div>

          {/* ✅ Shipment Type (Search + Disable Add if empty/exists) */}
          <div style={styles.section}>
            <label style={styles.label} className="qs-label">Shipment Type *</label>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginTop: 6 }}>
              <SearchableSelect
                {...pickerSkin}
                value={shipmentType}
                options={shipmentTypes}
                onPick={setShipmentType}
                placeholder="🔎 اكتب للبحث أو اختر نوع الشحنة…"
                invalid={missing.has("shipmentType")}
              />

              <input
                placeholder="Add new type…"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                {...inputProps("newType")}
              />

              <button
                type="button"
                onClick={handleAddType}
                style={{
                  ...styles.addButton,
                  opacity: disableAddType ? 0.55 : 1,
                  cursor: disableAddType ? "not-allowed" : "pointer",
                }}
                disabled={disableAddType}
                title={
                  !newTypeNorm
                    ? "Enter type name"
                    : typeExists
                      ? "Type already exists"
                      : "Add type"
                }
              >
                ➕ Add Type
              </button>
            </div>
          </div>

          {/* General Information */}
          <fieldset style={styles.fieldset}>
            <legend style={styles.legend} className="qs-legend">📋 General Information</legend>

            <div style={styles.grid}>
              {[
                ["Report On","reportOn","date"],
                ["Sample Received On","receivedOn","date"],
                ["Inspection Date","inspectionDate","date"],
                ["Temperature","temperature","text"],
                ["Vehicle Temperature (°C) — قبل التفريغ","vehicleTemperature","text"],
                ["Invoice No","invoiceNo","text"],
                ["PH","ph","text"],
                ["Receiving Address (عنوان الاستلام)","receivingAddress","branch"],
                ["Air Way Bill No","airwayBill","text"],
              ].map(([label, field, type]) => {
                const isReq = REQUIRED_FIELDS.has(field);
                return (
                  <div key={field} style={styles.row}>
                    <label style={styles.label} className="qs-label">
                      {label}{isReq ? " *" : ""}
                    </label>

                    {type === "branch" ? (
                      <select
                        value={generalInfo[field]}
                        onChange={(e) => handleGeneralChange(field, e.target.value)}
                        {...selectProps(field, isReq && missing.has(field))}
                        required={isReq}
                      >
                        <option value="">-- اختر الفرع --</option>
                        {BRANCHES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    ) : type === "date" ? (
                      <input
                        type="date"
                        value={generalInfo[field]}
                        onChange={(e) => handleGeneralChange(field, e.target.value)}
                        {...inputProps(field, isReq && missing.has(field))}
                        required={isReq}
                      />
                    ) : (
                      (() => {
                        const isAvg = field === "temperature" || field === "ph";
                        const value =
                          field === "temperature" ? avgTemp :
                          field === "ph" ? avgPh :
                          generalInfo[field];

                        const style = {
                          ...inputProps(field, isReq && missing.has(field)).style,
                          ...(isAvg ? { background: "#f8fafc", fontWeight: 700 } : {})
                        };

                        return (
                          <input
                            value={value}
                            onChange={isAvg ? undefined : (e) => handleGeneralChange(field, e.target.value)}
                            readOnly={isAvg}
                            style={style}
                            placeholder={isAvg ? "Auto (from samples)" : undefined}
                            required={isReq}
                          />
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>

            {/* 🏷️ Brand + 🌍 Origin — lists, not free text. Both keep the same
                "pick one, or add one that sticks" shape the supplier field has. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14, marginTop: 14 }}>
              {[
                {
                  field: "brand",
                  label: "Brand",
                  icon: "🏷️",
                  options: brandOptions,
                  placeholder: "🔎 اكتب للبحث أو اختر الماركة…",
                  empty: "لا توجد ماركات بعد — أضف واحدة",
                  addValue: newBrand,
                  setAddValue: setNewBrand,
                  onAdd: handleAddBrand,
                  disabled: disableAddBrand,
                  exists: brandExists,
                  addPlaceholder: "Add new brand…",
                  title: (bad) => (bad ? "Enter brand name" : "Add brand"),
                },
                {
                  field: "origin",
                  label: "Origin",
                  icon: "🌍",
                  options: originOptions,
                  placeholder: "🔎 اكتب للبحث أو اختر بلد المنشأ…",
                  empty: "لا توجد بلدان منشأ بعد — أضف واحدة",
                  addValue: newOrigin,
                  setAddValue: setNewOrigin,
                  onAdd: handleAddOrigin,
                  disabled: disableAddOrigin,
                  exists: originExists,
                  addPlaceholder: "Add new origin…",
                  title: (bad) => (bad ? "Enter origin" : "Add origin"),
                },
              ].map((f) => {
                const bad = missing.has(f.field);
                return (
                  <div key={f.field} style={styles.row}>
                    <label style={styles.label} className="qs-label">{f.icon} {f.label} *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8 }}>
                      <SearchableSelect
                        {...pickerSkin}
                        value={String(generalInfo[f.field] || "")}
                        options={f.options}
                        onPick={(v) => handleGeneralChange(f.field, v)}
                        placeholder={f.placeholder}
                        emptyText={f.empty}
                        invalid={bad}
                      />

                      <input
                        placeholder={f.addPlaceholder}
                        value={f.addValue}
                        onChange={(e) => f.setAddValue(e.target.value)}
                        {...inputProps(`new_${f.field}`)}
                      />

                      <button
                        type="button"
                        onClick={f.onAdd}
                        disabled={f.disabled}
                        style={{
                          ...styles.addButton,
                          opacity: f.disabled ? 0.55 : 1,
                          cursor: f.disabled ? "not-allowed" : "pointer",
                        }}
                        title={f.exists ? "Already in the list" : f.title(!String(f.addValue || "").trim())}
                      >
                        ➕ Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loggers + Supplier wide */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              <div style={styles.row}>
                <label style={styles.label} className="qs-label">Local Logger</label>
                <select
                  value={generalInfo.localLogger}
                  onChange={(e) => handleGeneralChange("localLogger", e.target.value)}
                  {...selectProps("localLogger")}
                >
                  <option value="">-- Select --</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div style={styles.row}>
                <label style={styles.label} className="qs-label">International Logger</label>
                <select
                  value={generalInfo.internationalLogger}
                  onChange={(e) => handleGeneralChange("internationalLogger", e.target.value)}
                  {...selectProps("internationalLogger")}
                >
                  <option value="">-- Select --</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div style={{ ...styles.row, gridColumn: "1 / -1" }}>
                <label style={styles.label} className="qs-label">Supplier Name</label>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8 }}>
                  <SearchableSelect
                    {...pickerSkin}
                    value={generalInfo.supplierName}
                    options={supplierOptions}
                    onPick={(v) => handleGeneralChange("supplierName", v)}
                    placeholder="🔎 اكتب للبحث أو اختر المورّد…"
                    /* the tick comes from the Supplier Evaluation pages, so the
                       inspector sees at a glance who has been assessed */
                    decorate={(name) => {
                      const ev = supplierStatusOf(name);
                      return {
                        label: ev ? `${ev.mark} ${name}` : name,
                        title: ev
                          ? `Self-assessment received — ${ev.matched}${ev.date ? " · " + ev.date : ""}`
                          : "No self-assessment received",
                      };
                    }}
                  />

                  <input
                    placeholder="Add new supplier…"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    {...inputProps("newSupplier")}
                  />

                  <button
                    type="button"
                    onClick={handleAddSupplier}
                    style={{
                      ...styles.addButton,
                      opacity: disableAddSupplier ? 0.55 : 1,
                      cursor: disableAddSupplier ? "not-allowed" : "pointer",
                    }}
                    disabled={disableAddSupplier}
                    title={
                      !newSupplierNorm
                        ? "Enter supplier name"
                        : supplierExists
                          ? "Supplier already exists"
                          : "Add supplier"
                    }
                  >
                    ➕ Add
                  </button>
                </div>

                {generalInfo.supplierName && (() => {
                  const ev = supplierStatusOf(generalInfo.supplierName);
                  const tone = ev
                    ? { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#15803d" }
                    : { bg: "#f8fafc", bd: "#e2e8f0", fg: "#64748b" };
                  return (
                    <div style={{ marginTop: 8, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: tone.bg, border: `1px solid ${tone.bd}`, color: tone.fg, fontWeight: 800 }}>
                      <span>{ev ? ev.mark : "◻"}</span>
                      <span>{ev ? ev.label : "No evaluation received"}</span>
                      {ev?.detail && <span style={{ fontWeight: 600, opacity: .85 }}>· {ev.detail}</span>}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Status */}
            <div style={{ marginTop: 10 }}>
              <label style={styles.label} className="qs-label">Shipment Status</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                <select
                  value={shipmentStatus}
                  onChange={(e) => setShipmentStatus(e.target.value)}
                  {...selectProps("shipmentStatus")}
                  style={{
                    ...selectProps("shipmentStatus").style,
                    fontWeight: 900,
                    color: shipmentStatus === "Acceptable" ? "#16a34a" : shipmentStatus === "Average" ? "#d97706" : "#dc2626"
                  }}
                >
                  <option value="Acceptable">✅ Acceptable</option>
                  <option value="Average">⚠️ Average</option>
                  <option value="Below Average">❌ Below Average</option>
                </select>
                <span style={{ fontWeight: 900, color: shipmentStatus === "Acceptable" ? "#16a34a" : shipmentStatus === "Average" ? "#d97706" : "#dc2626" }}>
                  {shipmentStatus}
                </span>
              </div>
            </div>
          </fieldset>

          {/* Samples Table */}
          <div style={{ ...styles.section, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, fontWeight: 900, color: "#0c4a6e" }} className="qs-legend">🧪 Test Samples</h4>
            {/* the expiry column is calculated from these days, so the rule book
                sits next to the table it fills */}
            <button
              type="button"
              onClick={() => setShelfOpen(true)}
              title="Shelf life per product / category — مدة الصلاحية (تحسب تاريخ الانتهاء من الإنتاج، وتاريخ الإنتاج عكسياً من الانتهاء)"
              style={{ padding: "7px 14px", borderRadius: 999, border: "1px solid rgba(15,23,42,.14)", background: "#e0f2fe", color: "#0c4a6e", fontWeight: 800, cursor: "pointer" }}
            >
              ⏳ Shelf Life{shelf.config.rules.length || shelf.config.defaultDays ? ` (${shelf.config.rules.length + (shelf.config.defaultDays ? 1 : 0)})` : ""}
            </button>
          </div>
          <div style={styles.tableWrap}>
            <table style={{ ...styles.table, minWidth: 240 + samples.length * 190 }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, minWidth: 200, textAlign: "left" }}>Attribute</th>
                  {samples.map((_, idx) => <th key={idx} style={styles.th}>Sample {idx + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.firstColCell}>PRODUCT CODE</td>
                  {samples.map((s, i) => (
                    <td key={`code-${s.id}`} style={styles.td}>
                      <ItemCodeInput
                        code={s.productCode || ""}
                        name={s.productName || ""}
                        onChange={(pair) => setSampleProduct(i, pair)}
                        style={{ ...styles.tdInput, ...(String(s.productName || "").trim() ? {} : styles.invalid) }}
                        placeholder="e.g., 22000"
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={styles.firstColCell}>PRODUCT NAME</td>
                  {samples.map((s, i) => (
                    <td key={s.id} style={styles.td}>
                      <ItemNameInput
                        code={s.productCode || ""}
                        name={s.productName || ""}
                        onChange={(pair) => setSampleProduct(i, pair)}
                        style={{ ...styles.tdInput, ...(String(s.productName || "").trim() ? {} : styles.invalid) }}
                        placeholder="Search code or product…"
                      />
                    </td>
                  ))}
                </tr>
                {ATTRIBUTES.map((attr) => (
                  <tr key={attr.key} style={["temperature","ph","slaughterDate","expiryDate"].includes(attr.key) ? { background: "#f8fafc" } : undefined}>
                    <td style={styles.firstColCell}>
                      {attr.label}{attr.required ? <span style={{ color: "#dc2626" }}> *</span> : null}
                    </td>
                    {samples.map((s, i) => (
                      <td key={`${attr.key}-${s.id}`} style={styles.td}>
                        {attr.type === "dates" ? (
                          /* one shipment can carry several lots, so the cell
                             holds as many dates as the inspector needs */
                          <MultiDateField
                            value={s[attr.key]}
                            onChange={(v) => setSampleValue(i, attr.key, v)}
                            style={{
                              ...styles.tdInput,
                              ...(attr.required && !isoDatesIn(s[attr.key]).length ? styles.invalid : {}),
                            }}
                            hint={
                              attr.key === "expiryDate" ? expiryHint(i)
                                : attr.key === "slaughterDate" ? productionHint(i)
                                  : null
                            }
                          />
                        ) : (
                          <input value={s[attr.key]} onChange={(e) => setSampleValue(i, attr.key, e.target.value)} style={styles.tdInput} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={1 + samples.length} style={{ padding: "0.7rem" }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <button onClick={addSample} style={styles.addButton}>➕ Add Sample (column)</button>
                      {/* row removal, so it must not carry data-delete-action —
                          that attribute was hiding the button completely */}
                      <button onClick={removeSample} style={styles.dangerButton} disabled={samples.length <= 1}>🗑 Remove Sample (column)</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Product Lines */}
          <div style={{ marginTop: 14 }}>
            <label style={styles.label} className="qs-label">Product Lines</label>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "0.9fr 2fr 1fr 1fr auto", gap: 8, marginBottom: 4, fontWeight: 800, color: "#475569", fontSize: ".85rem" }}>
                <span>Item Code</span><span>Product Name</span><span>Qty (pcs)</span><span>Weight (kg)</span><span />
              </div>
              {sampleProducts.length === 0 && (
                <div style={{ color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontWeight: 700, fontSize: ".85rem" }}>
                  ⚠️ أدخل كود واسم المنتج في أعمدة العينات أولاً — أسطر المنتجات تُختار منها فقط.
                </div>
              )}
              {productLines.map((row) => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "0.9fr 2fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                  {/* A product line describes a product that was actually inspected
                      in the sample columns, so the code is picked from those
                      columns only — never free-typed from the whole catalog. */}
                  <select
                    value={lineKeyOf(row)}
                    onChange={(e) => pickLineProduct(row.id, e.target.value)}
                    {...selectProps(`pl_code_${row.id}`, !String(row.name || "").trim())}
                  >
                    <option value="">— اختر —</option>
                    {sampleProducts.map((sp) => (
                      <option key={sp.key} value={sp.key}>
                        {sp.code || "—"}{sp.name ? ` · ${sp.name}` : ""}
                      </option>
                    ))}
                    {lineKeyOf(row) && !sampleProducts.some((sp) => sp.key === lineKeyOf(row)) && (
                      <option value={lineKeyOf(row)}>
                        {row.code || "—"}{row.name ? ` · ${row.name}` : ""} (خارج العينات)
                      </option>
                    )}
                  </select>
                  <input
                    value={row.name || ""}
                    readOnly
                    placeholder="يُعبّأ من كود العينة"
                    title="اسم المنتج يأتي مع الكود من أعمدة العينات"
                    style={{ ...styles.input, background: "#f1f5f9", color: "#0f172a", fontWeight: 700 }}
                  />
                  <input type="number" min="0" step="1" placeholder="Qty (pcs)" value={row.qty} onChange={(e) => updateLine(row.id, "qty", e.target.value)} onWheel={(e) => e.currentTarget.blur()} {...inputProps(`pl_qty_${row.id}`)} />
                  <input type="number" min="0" step="0.001" placeholder="Weight (kg)" value={row.weight} onChange={(e) => updateLine(row.id, "weight", e.target.value)} onWheel={(e) => e.currentTarget.blur()} {...inputProps(`pl_weight_${row.id}`)} />
                  <button type="button" onClick={() => removeLine(row.id)} style={{ ...styles.dangerButton, padding: "9px 14px" }} disabled={productLines.length <= 1}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addLine} style={styles.addButton}>➕ Add Line</button>
            </div>
          </div>

          {/* Totals */}
          <div style={styles.formRow3}>
            <div>
              <label style={styles.label} className="qs-label">Total Quantity (pcs)</label>
              <input type="text" value={totalQuantity} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 900 }} />
            </div>
            <div>
              <label style={styles.label} className="qs-label">Total Weight (kg)</label>
              <input type="text" value={totalWeight} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 900 }} />
            </div>
            <div>
              <label style={styles.label} className="qs-label">Average Weight (kg/pc)</label>
              <input type="text" value={averageWeight} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 900 }} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 10 }}>
            <label style={styles.label} className="qs-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Write any additional notes here..."
              style={{ ...styles.input, minHeight: 100, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* Uploads */}
          <div style={styles.section}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={triggerImagesSelect} style={{ ...styles.uploadButton, opacity: isUploadingImages ? .6 : 1 }} disabled={isUploadingImages}>
                {isUploadingImages ? "⏳ Uploading…" : "📸 Upload Images"}
              </button>
              <input type="file" accept="image/*" multiple ref={imagesInputRef} onChange={handleImagesUpload} style={{ display: "none" }} />

              <button
                type="button"
                onClick={triggerCertificateSelect}
                style={{ ...styles.uploadButton, background: "linear-gradient(180deg,#8b5cf6,#7c3aed)", border: "1.5px solid #6d28d9", opacity: isUploadingCert ? .6 : 1 }}
                disabled={isUploadingCert}
                title="Halal certificate — image or PDF"
              >
                {isUploadingCert ? "⏳ Uploading…" : certificateUrl ? "📜 Replace Halal Certificate" : "📜 Upload Halal Certificate"}
              </button>
              <input
                type="file"
                accept="image/*,application/pdf"
                ref={certificateInputRef}
                onChange={handleCertificateUpload}
                style={{ display: "none" }}
              />
            </div>

            {certificateName && (
              <div style={{ marginTop: 6, fontWeight: 700, color: "#0c4a6e" }}>📎 {certificateName}</div>
            )}
            {certificateUrl && (
              <div style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                <a href={certificateUrl} target="_blank" rel="noreferrer" style={{ fontWeight:700 }}>🔗 Open Halal Certificate</a>
                <button
                  type="button"
                  onClick={handleDeleteCertificate}
                  style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 900, cursor: "pointer" }}
                  title="Delete certificate"
                 data-delete-action="true">
                  ✕ Delete
                </button>
              </div>
            )}

            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 10 }}>
                {images.map((src, i) => (
                  <div key={src} style={{ position: "relative", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#f8fafc" }}>
                    <img
                      src={src}
                      alt={`img-${i}`}
                      style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      title="Remove"
                      style={{ position: "absolute", top: 6, right: 6, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "3px 10px", fontWeight: 900, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginTop: 10 }}>
            <div>
              <label style={styles.label} className="qs-label">Inspected By *</label>
              <input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} placeholder="Inspector name" {...inputProps("inspectedBy", missing.has("inspectedBy"))} required />
            </div>
            <div>
              <label style={styles.label} className="qs-label">Verified By *</label>
              <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Verifier name" {...inputProps("verifiedBy", missing.has("verifiedBy"))} required />
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actionBar}>
            <button
              onClick={handleSave}
              style={{ ...styles.saveButton, ...(isSaving || isUploadingImages || isUploadingCert ? styles.saveButtonDisabled : {}) }}
              disabled={isSaving || isUploadingImages || isUploadingCert}
              title={isUploadingImages || isUploadingCert ? "انتظر انتهاء الرفع" : "حفظ التقرير"}
            >
              {isSaving ? "⏳ Saving..." : "💾 Save Report"}
            </button>

            <button onClick={() => navigate("/qcs-raw-material-view")} style={styles.viewButton}>
              📄 View Reports
            </button>

            <button onClick={() => navigate("/admin/all-reports-view")} style={styles.viewButton}>
              📊 All Reports (Summary)
            </button>

            {missing.size ? (
              <span className="qs-chip" style={{ color: "#b91c1c", fontWeight: 800 }}>
                🔴 لا يمكن الحفظ — {missing.size} حقل إلزامي ناقص
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.type && (
        <div style={styles.toastWrap}>
          <div
            role="alert"
            style={{
              ...styles.toast,
              background: toastColors(toast.type).bg,
              color: toastColors(toast.type).fg,
              borderColor: toastColors(toast.type).bd,
            }}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
