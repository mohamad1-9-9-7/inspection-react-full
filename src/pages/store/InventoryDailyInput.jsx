// D:\inspection-react-full\src\pages\store\InventoryDailyInput.jsx
import React, { useMemo, useState } from "react";

/* ===== API base (consistent with the rest of the project) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Product Code → Name map (auto fill) ===== */
const CODE_NAME_MAP = {
  "34012": "FROZEN BEEF FEET - KG",
  "34013": "FROZEN LAMB FEET - KG",
  "33004": "AUS LAMB RACK (VACCUM)",
  "10270KG": "FRESH LAMB FAT - KG ( Kidney fats)",
  "30027": "Al Mawashi Salami Montona",
  "38000": "PAKISTANI BEEF LEG - LOCAL - KG",
  "36125": "New Zealand Beef Tenderloin",
  "20143": "LOCAL CAMEL BONES - KG",
  "96478": "Cow kashkaval wheel",
  "96303": "CHICKEN BREAST - KG",
  "20098": "BRAZILIAN BEEF BRISKET - KG",
  "25017": "LAMB MERGUEZ - PROCESSED MEAT- KG",
  "34006": "FROZEN LAMB FAT - KG",
  "10211": "FRESH BEEF LIVER LOCAL - KG",
  "96457": "Roumy Cheese Young",
  "36000": "AUS BEEF ANGUS TOPSIDE - KG",
  "20182": "CHILLED AUS TOPSIDE - KG",
  "96001": "Olive Oil Pure - 5ltr",
  "34002": "FROZEN MINCED - KG",
  "36122": "New Zealand Beef Striploin - KG",
  "10317-1": "AUS FRESH LAMB  SPLEEN - KG",
  "25031": "SHISH TAWOOK WHITE - KG",
  "10614": "FRESH LAMB SHORTLOIN B\\IN",
  "10310-1": "FRESH LAMB SHANK - KG",
  "34004": "FROZEN LAMB AUS CARCASS - KG",
  "96246": "Liquid Pasteurized Egg Yolk-KG [4*5 Kg /Box",
  "96311": "CHICKEN GRILLER - KG",
  "96312": "CHICKEN SHAWARMA B/L - KG",
  "96164": "FRENCH FRIES - KG",
  "21305": "AUS BEEF ANGUS CUBE ROLL - KG",
  "22100": "S.A CHILLED MUTTON CARCASS - KG",
  "34331": "FROZEN LAMB HEART- KG",
  "34334": "FROZEN BEEF KIDNEY (BRAZILIAN) - KG",
  "99341": "Marinated WHOLE GRILL CHICKEN 1300 GM",
  "34441": "Fresh Lamb Head - Piece",
  "34438": "Fresh Lamb liver - Piece",
  "34439": "Fresh lamb Heart - piece",
  "34440": "Fresh Lamb Kidney - piece",
  "20180": "CHILLED AUS RIB EYE ROLL-KG",
  "34330": "FROZEN LAMB LIVER - KG",
  "34332": "FROZEN LAMB KIDNEY- KG",
  "30031": "Sausage w Vegt.(Prod.)",
  "10601": "FRESH LAMB Waste- KG",
  "10613": "FRESH LAMB FLAB B\\IN",
  "91035": "RED PEPPER POWDER (cayenne) - 95 gm",
  "91033": "TURMERIC - 100 gm",
  "97060 PLATE": "KIBBEH 35 G - PLATE",
  "15008-1": "FAT - KG",
  "20053": "BONES (LAMB AUSTRALIA) - KG",
  "90096": "SEVEN SPICES - 100 gm",
  "91036": "CRUSHED RED PEPPER(cayenne) - 90 gm",
  "71001": "LAMB KABAB FTR - BOX",
  "97070": "CHEESE ROLL - PIECE",
  "97064": "SAMBOUSAK CHEESE - PIECE",
  "97066": "SHISH BARAK - PIECE",
  "97069": "SPIINACH FATAYER - PIECE",
  "97065": "SAMBOUSAK MEAT - PIECE",
  "97062": "KIBBEH GRILLED - PIECE",
  "97063": "SAMBOUSAK VEGETABLE - PIECE",
  "97060": "KIBBEH 35 G - PIECE",
  "97068": "CHEESE FATAYER - PIECE",
  "97067": "MEAT FATAYER  - PIECE",
  "22000": "S.A CHILLED LAMB CARCASS - KG",
  "10050": "AUS FRESH CARCASS MERINO LAMB - KG",
  "20009": "CHILLED Waste- KG",
  "20050": "FLAB B/LESS (LAMB AUSTRALIA) - KG",
  "27101": "FRESH WHOLE CHICKEN 1200gm/KG",
  "22009": "S.A LAMB Waste- KG",
  "20100": "INDIAN VEAL LEG - KG",
  "99241": "Meat SHAWARMA_KG",
  "99253": "CHICKEN SHAWARMA MARINATED_KG",
  "36124": "New Zealand Beef Topside - KG",
  "99123": "CHICKEN STEAK W VEGT._KG",
  "97107- PLATE": "ROCCA SALAD- PLATE",
  "97105": "MUHAMMARA - PLATE",
  "97101": "FATTOUSH SALAD -  PLATE",
  "99130": "CHICKEN BIRYANI_KG",
  "10035": "AUS FRESH CARCASS XB-LAMB - KG",
  "13604": "Al Rawabi Heifer Local veal",
  "20026": "RACK SPECIAL CUTS  - KG",
  "20187": "CHILLED AUS KNUCKLE - KG",
  "97104": "MUTABAL - PLATE",
  "11302": "AUS VEAL Waste- KG",
  "22026": "S.A LAMB RACK SPECIAL CUTS - KG",
  "10300": "FRESH LAMB NECK - KG",
  "99107": "OKRA STEW WITH LAMB_KG",
  "36130": "New Zealand Waste",
  "71014": "Lamb French Rack - FTR",
  "71004": "LAMB TIKKA EXTRA FTR - BOX",
  "20142": "LOCAL CAMEL MEAT BONE-LESS - KG",
  "34347": "General Trimmings/Bones (Union)",
  "10370": "FRESH LAMB RACK - KG",
  "10606": "FRESH LAMB SHOULDER B\\IN",
  "13602": "Boneless - AL RAWABI VEAL CARCASS - KG",
  "22025": "S.A LAMB RACK SADDELE - KG",
  "34348": "AUS CHILLED HOGGET CARCASS - KG",
  "21000": "AUSTRALIAN MUTTON CARCASS_ KG",
  "34453": "FROZEN LAMB AUS CUBE BONE IN - KG",
  "97061": "KIBBEH 50 G - PIECE",
  "36009": "AUS BEEF ANGUS STRIPLOIN - KG",
  "20181": "CHILLED AUS STRIPLOIN - KG",
  "13606": "FRESH VEAL TAIL - KG",
  "10375": "FRESH LAMB RACK SPECIAL CUT - KG",
  "38004": "PAKISTANI BEEF Waste- KG",
  "11801": "DUTCH BEEF MEAT BONE LESS",
  "10600": "FRESH LAMB BONE - KG",
  "38003": "PAKISTANI BEEF BONES - KG",
  "25002": "KUFTA - PROCESSED MEAT",
  "20064": "Brazilian Beef Mince",
  "22050": "S.A LAMB FLAB B/LESS - KG",
  "27103": "CHICKEN LIVER - KG",
  "22020": "S.A LAMB LEG-BONELESS - KG",
  "25005": "BURGER - PROCESSED MEAT",
  "34314": "FROZEN WHOLE CHICKEN (800G) - KG",
  "30026": "Al Mawashi French Polony",
  "34346": "General TRIMMINGS (Cutting Cleaning)- KG",
  "96436": "Fresh Naboulsi Cheese",
  "27104": "CHICKEN LEG - KG",
  "20170": "KAZAKHSTAN LAMB - KG",
  "20075": "BRAZILIAN BEEF STRIPLOIN - KG",
  "38001": "PAKISTANI BEEF SHOULDER - LOCAL - KG",
  "99470": "Marinated WHOLE CHICKEN 800 GM - KG",
  "20052": "SHORTLOIN B/IN (LAMB AUTRALIA) - KG",
  "34315": "FRESH WHOLE CHICKEN (1150GM) - KG",
  "20000": "AUS CHILLED LAMB CARCASS - KG",
  "20036": "CHILLED MINCED MEAT - KG",
  "20011": "LAMB SAUSAGE MEXICAN STYLE - KG",
  "11702": "AUS VEAL MINCED",
  "11800": "LOCAL DUTCH VEAL MEAT BONE IN - KG",
  "20015": "LEG-BONE IN (LAMB AUSTRALIA) - KG",
  "20054": "SHORTLOIN B/LESS (LAMB AUSTRALIA) - KG",
  "10608": "FRESH LAMB LEG B\\IN",
  "20060": "BRAZILIAN BEEF TOPSIDE - KG",
  "25006": "TIKKA - PROCESSED MEAT",
  "20140": "LOCAL CAMEL MEAT BONE-IN - KG",
  "20185": "CHILLED AUS CHUCK ROLL- KG",
  "10415": "Noaimi Fresh - KG",
  "37008": "VAC LAMB AUS LEG 3 BONES - BONE IN SHANK ON CHUMP ON - KG",
  "22045": "S.A LAMB FLAB B/IN - KG",
  "20081": "BRAZILIAN BEEF STRIPLOIN STEAK - KG",
  "91003": "CHICKEN SPICES - 100 gm",
  "20186": "CHILLED AUS TENDERLOIN - KG",
  "23071": "AUS VEAL D RUMP A GRADE - KG",
  "30019": "Al Mawashi Hunters Drywors",
  "36107": "AUS BEEF WAGYU BEEF MINCED - KG",
  "34336": "FROZEN LAMB BRAIN (AUS) - KG",
  "36123": "New Zealand Beef Cuberoll - KG",
  "27106": "CHICKEN WINGS - KG",
  "20035": "SHOULDER (LAMB AUSTRALIA) - KG",
  "20045": "FLAB B/IN (LAMB AUSTRALIA) - KG",
  "27102": "CHICKEN BREAST FILLET - KG",
  "20055": "BRAZILIAN BEEF KNUCKLE - KG",
  "20070": "BRAZILIAN BEEF SHOULDER - KG",
  "20025": "RACK SADDLE (LAMB AUSTRALIA) - KG",
  "60100": "Paper Max Roll",
  "96470": "Sheep Kashkaval Wheel (3KG) - KG",
  "20042": "HIND SHANK - KG",
  "27100": "FRESH WHOLE CHICKEN 800gm/KG",
  "20115": "INDIAN MUTTON CARCASS - KG",
  "60140": "Multi Clean 4X5 Ltrs",
  "15009-1": "BONES - KG",
  "99104": "KIBBEH / SHISH BARAK BIL LABAN_KG",
  "25000": "NAKANEK - PROCESSED MEAT",
  "22053": "S.A LAMB BONES - KG",
  "20063": "Brazillian Waste",
  "99114": "CUT BEANS STEW W LAMB_KG",
  "30029": "Al Mawashi Hunters Biltong",
  "99228": "MACARONI BECHAMEL_KG",
  "25001": "SIJOUK - PROCESSED MEAT",
  "25009": "MINCED - PROCESSED MEAT",
  "20144": "LOCAL CAMEL Waste- KG",
  "13600": "AL RAWABI VEAL CARCASS - KG",
  "71021": "SHISH TAWOOK WHITE FTR - BOX",
  "20188": "Chilled Aus Beef Waste",
  "36128": "NEW ZEALAND BEEF KNUCKLE - KG",
  "30021": "Al Mawashi Dhanya Braai Sausage",
  "30020": "Al Mawashi Farmstyle Extra Sausage",
  "11301": "AUS VEAL BONES - KG",
  "30022": "Al Mawashi Roast Chicken Sausage",
  "30023": "Al Mawashi BREAKFAST SAUSAGE",
  "22052": "S.A LAMB SHORTLOIN B/IN - KG",
  "34008": "FROZEN BEEF LIVER (AUS) - KG",
  "96463": "Gouda Cumin (KG)",
  "96481": "EDAM BALL",
  "60030": "AL MAWASHI PRINTED BAGS  - 14 X 71",
  "71071": "TABBOULEH FTR - PLATE",
  "71073": "MUTABAL FTR - PLATE",
  "71072": "HUMMOS FTR - PLATE",
  "20040": "NECK (LAMB AUSTRALIA) - KG",
  "97103": "TABBOULEH SALAD - PLATE",
  "99153": "VERMICELLI RICE_KG",
  "38002": "PAKISTANI BEEF BONELESS",
  "22015": "S.A LAMB LEG-BONE IN - KG",
  "71000": "LAMB CHOPS FTR - BOX (Tomahawk)",
  "71070": "FATTOUSH FTR - PLATE",
  "71075": "ROCCA SALAD FTR - PLATE",
  "71002": "LAMB TIKKA FTR - BOX",
  "96479": "Emmental cheese light block",
  "20095": "BRAZILIAN BEEF CHUCK ROLL - KG",
  "22040": "S.A LAMB NECK - KG",
  "69206": "BH45-1L All Surface Instant Sanitizer 1ltr",
  "20056": "BRAZILIAN BEEF RIB EYE STEAK - KG",
  "36001": "AUS CHILLED BEEF ANGUS TENDERLOIN - KG",
  "20080": "BRAZILIAN BEEF CUBEROLL - KG",
  "71020": "SHISH TAWOOK RED FTR - BOX",
  "71076": "GRILLED VEGETABLE FTR - PLATE",
  "71074": "CORN ON THE COP FTR - PLATE",
  "96180": "ARABIC BREAD SMALL- PIECE",
  "25032": "CHICKEN KABAB - KG",
  "96449": "Anchor Color Cheddar",
  "96480": "Parmesan grana pedano Hard cheese parmesan",
  "20065": "BRAZILIAN BEEF TENDERLOIN - KG",
  "30024": "Al Mawashi Chilli Oriental  Sausage",
  "37003": "AUS VAC LAMB B/IN SQUARE CUT SHOULDER - KG",
  "60126": "BIO-HDPE Plastic Bag Big",
  "69215": "GARBAGE BAG 50MIC 100*130cm (18KG) - BDL",
  "60215-1": "HD Plain Bag - PCs",
  "60110": "Disposable Latex Gloves",
  "60101": "Tissue Box - PC",
  "61029": "RECT. ALUMINIUM CONT. 1050cc  - CTN",
  "61031": "Rect Aluminum Cont. LID_CTN",
  "99235": "LAMB VEGT. MOUSAKA_KG",
  "99339": "Marinated WHOLE CHICKEN 1000 GM",
  "97102": "HUMMUS - PLATE",
  "10210KG": "AUS FRESH LAMB LIVER - KG",
  "25046": "HONEY SHISH TAWOOK-KG",
  "22035": "S.A LAMB SHOULDER - KG",
  "99168": "CHICKEN SWEET AND SOUR_KG",
  "99191": "BEEF steak W BROWN SAUCE_KG",
  "99402": "Bukhari Lamb",
  "99192": "LAMB MAKLOUBA_KG",
  "20020": "LEG-BONELESS (LAMB AUSTRALIA) - KG",
  "25030": "SHISH TAWOOK RED - KG",
  "30056": "Thyme & Lemon Chicken Skewer - PLATE",
  "30057": "Arizona Chicken Skewer - PLATE",
  "30058": "Thyme & Rosemary Chicken Skewer - PLATE",
  "30059": "Peperoni Rossi Chicken Skewer - PLATE",
  "71003": "MIX LAMB (KABAB&TIKKA) FTR - BOX",
  "71023": "MIX SHISH TAWOOK (RED & WHITE) FTR - BOX",
  "99340": "Marinated WHOLE CHICKEN  1300 GM",
  "25016": "BEEF MERGUEZ - PROCESSED MEAT- KG",
  "32001": "S.A CHILLED BEEF SILVERSIDE - KG",
  "37004": "AUS VAC LAMB B/IN HINDSHANK HEEL ON  - KG"
};

/* ===== Helpers ===== */
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS = [
  { value: "OK",          label: "OK" },
  { value: "NEAR_EXPIRY", label: "Near Expiry (<=7 days)" },
  { value: "EXPIRED",     label: "Expired" },
  { value: "DAMAGED",     label: "Damaged/Returned" },
  { value: "UNKNOWN",     label: "Unknown" },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date((dateStr || "") + "T00:00:00").getTime();
  if (Number.isNaN(target)) return null;
  return Math.round((target - startOfToday) / (1000 * 60 * 60 * 24));
}

function autoStatus(row) {
  if (!row?.expDate) return "UNKNOWN";
  const d = daysUntil(row.expDate);
  if (d == null) return "UNKNOWN";
  if (d < 0) return "EXPIRED";
  if (d <= 7) return "NEAR_EXPIRY";
  return "OK";
}

const NEW_ROW = () => ({
  id: Math.random().toString(36).slice(2),
  code: "",
  name: "",
  qtyPcs: "",
  qtyKg: "",
  prodDate: "",
  expDate: "",
  awbNo: "",
  sifNo: "",
  supplierName: "",
  status: "OK",
  _manualStatus: false,
  _autoName: false,          // ✅ لمعرفة إن كان الاسم معبأ تلقائيًا
  remarks: "",
});

const NEW_SECTION = (title = "New Section", rowsCount = 3) => ({
  id: "sec_" + Math.random().toString(36).slice(2),
  title,
  rows: Array.from({ length: Math.max(1, rowsCount) }, NEW_ROW),
});

/* ===== Component ===== */
export default function InventoryDailyInput() {
  const [date, setDate] = useState(today());
  const [sections, setSections] = useState([NEW_SECTION("General", 3)]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Store Keeper Name (required before saving)
  const [storeKeeperName, setStoreKeeperName] = useState("");

  // Add-section controls
  const [newSecTitle, setNewSecTitle] = useState("");
  const [newSecRows, setNewSecRows] = useState(3);

  // Totals across all sections
  const totals = useMemo(() => {
    const allRows = sections.flatMap((s) => s.rows);
    const sum = (k) => allRows.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0);
    return { qtyPcs: sum("qtyPcs"), qtyKg: sum("qtyKg") };
  }, [sections]);

  function updateRow(sectionId, rowId, key, value) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const rows = sec.rows.map((r) => {
          if (r.id !== rowId) return r;

          const next = { ...r, [key]: value };

          // ✅ أوتوماتيك: تحديث الحالة حسب التاريخ
          if ((key === "expDate" || key === "prodDate") && !r._manualStatus) {
            next.status = autoStatus(next);
          }
          if (key === "status") next._manualStatus = true;

          // ✅ أوتوماتيك: ملء اسم المنتج من الكود
          if (key === "code") {
            const codeKey = String(value || "").trim();
            const mappedName = CODE_NAME_MAP[codeKey];
            if (mappedName) {
              // عدّل الاسم تلقائيًا فقط إذا كان فارغًا أو كان متولّد تلقائيًا سابقًا
              if (!r.name || r._autoName) {
                next.name = mappedName;
                next._autoName = true;
              }
            } else {
              // كود غير معروف: لا نغيّر اسم أدخله المستخدم يدويًا
              if (r._autoName) {
                next.name = "";      // امسح اسم تلقائي سابق إذا ما عاد في مطابقة
                next._autoName = false;
              }
            }
          }

          // لو المستخدم عدّل الاسم يدويًا، نثبّتُه
          if (key === "name") {
            next._autoName = false;
          }

          return next;
        });
        return { ...sec, rows };
      })
    );
  }

  function addRow(sectionId) {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, rows: [...sec.rows, NEW_ROW()] } : sec))
    );
  }

  function duplicateRow(sectionId, rowId) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const idx = sec.rows.findIndex((r) => r.id === rowId);
        if (idx === -1) return sec;
        const src = sec.rows[idx];
        const copy = { ...src, id: Math.random().toString(36).slice(2) };
        const rows = [...sec.rows.slice(0, idx + 1), copy, ...sec.rows.slice(idx + 1)];
        return { ...sec, rows };
      })
    );
  }

  function removeRow(sectionId, rowId) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const rows = sec.rows.length > 1 ? sec.rows.filter((r) => r.id !== rowId) : sec.rows;
        return { ...sec, rows };
      })
    );
  }

  function updateSectionTitle(sectionId, value) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: value } : s))
    );
  }

  function addSection() {
    const t = (newSecTitle || "").trim() || "New Section";
    const n = Math.max(1, parseInt(newSecRows, 10) || 3);
    setSections((prev) => [...prev, NEW_SECTION(t, n)]);
    setNewSecTitle("");
    setNewSecRows(3);
  }

  function deleteSection(sectionId) {
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== sectionId) : prev));
  }

  /* ===== Save to server only ===== */
  async function save() {
    // Require Store Keeper Name
    if (!storeKeeperName.trim()) {
      setMessage("Please enter the Store Keeper name before saving.");
      return;
    }

    // Clean rows (status auto if not manually set) and drop empty lines
    const cleanSections = sections.map((sec) => ({
      ...sec,
      rows: sec.rows
        .map((r) => ({ ...r, status: r._manualStatus ? r.status : autoStatus(r) }))
        .filter((r) => r.code?.trim() || r.name?.trim()),
    }));

    const hasAny = cleanSections.some((s) => s.rows.length);
    if (!hasAny) {
      setMessage("Please add at least one line (product code or name).");
      return;
    }

    // Request body expected by the server
    const body = {
      type: "inventory_daily_grouped",
      payload: {
        date,
        createdAt: new Date().toISOString(),
        totals,
        sections: cleanSections,
        branch: "STORE",
        storeKeeperName,
      },
    };

    try {
      setIsSaving(true);
      setMessage("Saving to server...");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server responded ${res.status}: ${txt || res.statusText}`);
      }
      setMessage("Saved to server successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Server error: failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  /* ===== Styles ===== */
  const BORDER = "#cfd8e3";
  const page = { padding: 16 };
  const card = {
    width: "100%",
    margin: "0 auto",
    borderRadius: 16,
    border: `1px solid ${BORDER}`,
    background: "linear-gradient(180deg,#ffffff, #f8fafc)",
    boxShadow: "0 12px 40px rgba(2,6,23,.08)",
    overflow: "hidden",
  };
  const header = {
    padding: "18px 20px",
    background: "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 60%,#22d3ee 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
  const title = { margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: 0.2 };
  const sub = { margin: 0, opacity: 0.92, fontSize: 13, fontWeight: 600 };

  const bar = {
    padding: "12px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    borderBottom: `1px solid ${BORDER}`,
    background: "#fbfdff",
  };
  const inputTop = {
    padding: "8px 10px",
    border: "1px solid #c7d2fe",
    borderRadius: 10,
    outline: "none",
    background: "#fff",
    minWidth: 220,
    boxShadow: "0 1px 0 rgba(2,6,23,.02)",
  };
  const smallInp = {
    padding: "8px 10px",
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    outline: "none",
    background: "#fff",
  };
  const pill = (bg, border, color = "#fff") => ({
    padding: "10px 14px",
    border: `1px solid ${border}`,
    borderRadius: 999,
    background: bg,
    color,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(2,6,23,.12)",
  });

  const wrap = { padding: 16 };
  const table = {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 13,
  };
  const th = {
    position: "sticky",
    top: 0,
    background: "#f1f5f9",
    color: "#0f172a",
    textAlign: "left",
    padding: "10px 8px",
    border: `1px solid ${BORDER}`,
    zIndex: 1,
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "8px",
    border: `1px solid ${BORDER}`,
    verticalAlign: "top",
    background: "#fff",
  };
  const tdNum = { ...td, textAlign: "right", whiteSpace: "nowrap" };
  const inp = {
    width: "100%",
    padding: "7px 9px",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  };
  const inpNum = { ...inp, textAlign: "right" };
  const btnDel = {
    padding: "7px 10px",
    border: "1px solid #fecaca",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  };
  const btnDup = {
    padding: "7px 10px",
    border: "1px solid #c7d2fe",
    background: "#e0e7ff",
    color: "#1e3a8a",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    marginInlineEnd: 6,
  };

  /* --- Section colors (cycled) --- */
  const SEC_COLORS = [
    { bg: "#fff7ed", border: "#fdba74", ink: "#7c2d12" }, // orange
    { bg: "#f0f9ff", border: "#93c5fd", ink: "#1e3a8a" }, // blue
    { bg: "#ecfeff", border: "#67e8f9", ink: "#134e4a" }, // cyan/teal
    { bg: "#fdf2f8", border: "#f9a8d4", ink: "#831843" }, // pink
    { bg: "#f0fdf4", border: "#86efac", ink: "#14532d" }, // green
    { bg: "#fefce8", border: "#fde68a", ink: "#713f12" }, // yellow
  ];
  const colorForSection = (i) => SEC_COLORS[i % SEC_COLORS.length];

  const secHeaderTd = (c) => ({
    ...td,
    background: c.bg,
    borderColor: c.border,
    color: c.ink,
    fontWeight: 900,
    fontSize: 14,
    boxShadow: `inset 4px 0 0 ${c.border}`,
  });
  const secTitleInput = (c) => ({
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontWeight: 900,
    background: "#ffffff",
    minWidth: 220,
    color: c.ink,
  });

  return (
    <div style={page}>
      <div style={card}>
        {/* Header */}
        <div style={header}>
          <div>
            <h3 style={title}>Daily Inventory - Store</h3>
            <p style={sub}>Group your lines by category (e.g., Chilled, Vacuum, etc.) and save.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: "rgba(255,255,255,.9)", fontWeight: 700 }}>{message}</div>
          </div>
        </div>

        {/* Top bar */}
        <div style={bar}>
          <label style={{ fontWeight: 700 }}>
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputTop, marginLeft: 8 }}
            />
          </label>

          {/* Store Keeper Name (required) */}
          <label style={{ fontWeight: 700 }}>
            Store Keeper:
            <input
              type="text"
              placeholder="Store Keeper Name"
              value={storeKeeperName}
              onChange={(e) => setStoreKeeperName(e.target.value)}
              style={{ ...inputTop, marginLeft: 8, minWidth: 260 }}
            />
          </label>

          {/* Add Section Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              style={{ ...smallInp, minWidth: 200 }}
              placeholder="Section title (e.g., Chilled)"
              value={newSecTitle}
              onChange={(e) => setNewSecTitle(e.target.value)}
            />
            <input
              type="number"
              min={1}
              style={{ ...smallInp, width: 110 }}
              value={newSecRows}
              onChange={(e) => setNewSecRows(e.target.value)}
              placeholder="# rows (default 3)"
            />
            <button onClick={addSection} style={pill("#ffffff", BORDER, "#0f172a")}>+ Add Section</button>
          </div>

          <div style={{ flex: 1 }} />
          <button
            onClick={save}
            disabled={isSaving}
            style={pill("linear-gradient(90deg,#22d3ee,#3b82f6)", "transparent")}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Table */}
        <div style={wrap}>
          {/* 🔎 اقتراحات الأكواد */}
          <datalist id="productCodes">
            {Object.keys(CODE_NAME_MAP).map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>

          <table style={table}>
            {/* widths sum = 100% */}
            <colgroup>
              <col style={{ width: "3%"  }} />  {/* # */}
              <col style={{ width: "8%"  }} />  {/* Product Code */}
              <col style={{ width: "22%" }} />  {/* Product Name */}
              <col style={{ width: "6%"  }} />  {/* Qty (pcs) */}
              <col style={{ width: "6%"  }} />  {/* Qty (kg) */}
              <col style={{ width: "8%"  }} />  {/* Production Date */}
              <col style={{ width: "8%"  }} />  {/* Expiry Date */}
              <col style={{ width: "7%"  }} />  {/* AWB */}
              <col style={{ width: "6%"  }} />  {/* SIF */}
              <col style={{ width: "10%" }} />  {/* Supplier Name */}
              <col style={{ width: "6%"  }} />  {/* Status */}
              <col style={{ width: "6%"  }} />  {/* Remarks */}
              <col style={{ width: "8%"  }} />  {/* Actions (Clone/Delete) */}
            </colgroup>

            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Product Code</th>
                <th style={th}>Product Name</th>
                <th style={th}>Qty (pcs)</th>
                <th style={th}>Qty (kg)</th>
                <th style={th}>Production Date</th>
                <th style={th}>Expiry Date</th>
                <th style={th}>AWB No.</th>
                <th style={th}>SIF No.</th>
                <th style={th}>Supplier Name</th>
                <th style={th}>Status</th>
                <th style={th}>Remarks</th>
                <th style={th}></th>
              </tr>
            </thead>

            <tbody>
              {sections.map((sec, sIdx) => {
                const c = colorForSection(sIdx);
                return (
                  <React.Fragment key={sec.id}>
                    {/* Section header row (editable title, colored) */}
                    <tr>
                      <td style={secHeaderTd(c)} colSpan={13}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span aria-hidden>#{sIdx + 1}.</span>
                            <input
                              aria-label="Section title"
                              value={sec.title}
                              onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                              style={secTitleInput(c)}
                              placeholder="Section title"
                            />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => addRow(sec.id)} style={pill("#ffffff", c.border, c.ink)}>+ Add Row</button>
                            <button onClick={() => deleteSection(sec.id)} style={pill("#fee2e2", "#fecaca", "#7f1d1d")}>Delete Section</button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Section rows */}
                    {sec.rows.map((r, idx) => {
                      const d = daysUntil(r.expDate);
                      const hint =
                        r._manualStatus
                          ? ""
                          : (r.expDate
                              ? d < 0
                                ? "Expired"
                                : d <= 7
                                ? `Near expiry (${d} day${d === 1 ? "" : "s"})`
                                : ""
                              : "No expiry date");

                      const rowNumber =
                        sec.rows.slice(0, idx).length +
                        sections.slice(0, sIdx).reduce((a, ss) => a + ss.rows.length, 0) + 1;

                      return (
                        <tr key={r.id}>
                          <td style={td}>{rowNumber}</td>
                          <td style={td}>
                            <input
                              style={inp}
                              value={r.code}
                              onChange={(e) => updateRow(sec.id, r.id, "code", e.target.value)}
                              placeholder="e.g., 100245"
                              list="productCodes"     // ✅ اقتراحات
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={inp}
                              value={r.name}
                              onChange={(e) => updateRow(sec.id, r.id, "name", e.target.value)}
                              placeholder="Product name"
                            />
                          </td>
                          <td style={tdNum}>
                            <input
                              type="number"
                              step="0.01"
                              style={inpNum}
                              value={r.qtyPcs}
                              onChange={(e) => updateRow(sec.id, r.id, "qtyPcs", e.target.value)}
                            />
                          </td>
                          <td style={tdNum}>
                            <input
                              type="number"
                              step="0.01"
                              style={inpNum}
                              value={r.qtyKg}
                              onChange={(e) => updateRow(sec.id, r.id, "qtyKg", e.target.value)}
                            />
                          </td>
                          <td style={td}>
                            <input
                              type="date"
                              style={inp}
                              value={r.prodDate}
                              onChange={(e) => updateRow(sec.id, r.id, "prodDate", e.target.value)}
                            />
                          </td>
                          <td style={td}>
                            <input
                              type="date"
                              style={inp}
                              value={r.expDate}
                              onChange={(e) => updateRow(sec.id, r.id, "expDate", e.target.value)}
                            />
                            {hint && <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>{hint}</div>}
                          </td>
                          <td style={td}>
                            <input
                              style={inp}
                              value={r.awbNo}
                              onChange={(e) => updateRow(sec.id, r.id, "awbNo", e.target.value)}
                              placeholder="Air Waybill"
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={inp}
                              value={r.sifNo}
                              onChange={(e) => updateRow(sec.id, r.id, "sifNo", e.target.value)}
                              placeholder="SIF No."
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={inp}
                              value={r.supplierName}
                              onChange={(e) => updateRow(sec.id, r.id, "supplierName", e.target.value)}
                              placeholder="Supplier"
                            />
                          </td>
                          <td style={td}>
                            <select
                              style={inp}
                              value={r.status}
                              onChange={(e) => updateRow(sec.id, r.id, "status", e.target.value)}
                            >
                              {STATUS_OPTIONS.map((op) => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={td}>
                            <input
                              style={inp}
                              value={r.remarks}
                              onChange={(e) => updateRow(sec.id, r.id, "remarks", e.target.value)}
                              placeholder="Notes..."
                            />
                          </td>
                          <td style={td}>
                            <button
                              onClick={() => duplicateRow(sec.id, r.id)}
                              style={btnDup}
                              title="Duplicate this row"
                            >
                              Duplicate
                            </button>
                            <button onClick={() => removeRow(sec.id, r.id)} style={btnDel}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td style={{ ...td, background: "#f1f5f9", fontWeight: 900 }} colSpan={3}>Totals</td>
                <td style={{ ...tdNum, background: "#f1f5f9", fontWeight: 900 }}>
                  {(+totals.qtyPcs || 0).toFixed(2)}
                </td>
                <td style={{ ...tdNum, background: "#f1f5f9", fontWeight: 900 }}>
                  {(+totals.qtyKg || 0).toFixed(2)}
                </td>
                <td style={{ ...td, background: "#f1f5f9" }} colSpan={8}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
