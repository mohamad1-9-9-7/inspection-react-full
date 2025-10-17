// src/pages/monitor/branches/pos19/pos19_inputs/CleaningProgrammeScheduleInput.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ===== API base (aligned) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants ===== */
const TYPE   = "pos19_cleaning_programme_schedule";
const BRANCH = "POS 19";
const STORAGE_KEY = `${TYPE}_draft`;

/* ====== Styles ====== */
const gridStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: 12,
};
const thCell = {
  border: "1px solid #1f3b70",
  padding: "8px 6px",
  textAlign: "center",
  whiteSpace: "pre-line",
  fontWeight: 800,
  background: "#e9f0ff",
  color: "#0b1f4d",
};
const tdCell = {
  border: "1px solid #1f3b70",
  padding: "8px 6px",
  verticalAlign: "top",
  whiteSpace: "pre-line",
  color: "#0b1f4d",
};
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #c7d2fe",
  borderRadius: 6,
  padding: "6px 8px",
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minHeight: 34,
};
function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

/* ===== Utils ===== */
function getQueryParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || "";
  } catch {
    return "";
  }
}
function firstDayIsoWithOffset(monthYYYYMM) {
  if (!/^\d{4}-\d{2}$/.test(monthYYYYMM || "")) return new Date().toISOString();
  return `${monthYYYYMM}-01T00:00:00+04:00`;
}
function normalizeMonth(m) {
  if (!m) return "";
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  try {
    const d = new Date(`${m} 1, ${new Date().getFullYear()}`);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${mm}`;
  } catch {
    return String(m);
  }
}

/* ===== SCHEDULE DATA ===== */
const SCHEDULE_ROWS = [
  { item: "Walk-in Chiller", equipment:
    "Gloves, brush, mop & bucket, scouring pad, clean cloth.\nBH20 general purpose cleaner (30 ml in 600 ml water), contact time 2–3 minutes, rinse with water, dry.\nBH30 sanitizer (200–500 ppm), contact time 2–3 minutes, then wipe with clean tissue/cloth, air dry.",
    method:
    "1. Sweep to remove dirt.\n2. Clean & sanitize the door handle.\n3. Clean & sanitize stainless-steel shelves.\n4. Mop floor using GP cleaner, then water, dry.\nDeep clean:\n1) Shift food to another chiller if >4h.\n2) Switch off power.\n3) Remove/wipe plastic curtains & sanitize.\n4) Clean floor & wall with GP cleaner.\n5) Clean/sanitize handle & shelves.\n6) Mop as above.\n7) Turn on power until ≥5°C, return food.",
    frequency: "Daily / Weekly",
  },
  { item: "Plastic curtain strips", equipment:
    "Gloves, scouring pad, brush.\nBH20 general purpose cleaner (30 ml in 600 ml water), contact time 2–3 minutes, rinse with water, dry.",
    method:
    "1. Remove the strips from the door.\n2. Scrub & wash using GP cleaner.\n3. Rinse with water & air dry.",
    frequency: "Weekly",
  },
  { item: "Countertop & standing storage chillers", equipment:
    "Gloves, tissue, brush, scouring pad.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse with water, air dry.\nBH30 sanitizer (200–500 ppm), contact time 2–3 minutes, wipe, air dry.",
    method:
    "Daily:\n1. Clean & disinfect racks & inside with sanitizer (remove food first).\n2. Sanitize exterior incl. handle & gasket.\nDeep clean:\n1) Shift food if deep clean >4h.\n2) Switch off & remove racks.\n3) Wash racks with soap; rinse & sanitize.\n4) Sanitize interior & exterior; power on to ≤5°C.\n5) Return food.",
    frequency: "Daily / Weekly",
  },
  { item: "Display chiller cabinets", equipment:
    "Gloves, tissue, scouring pad.\nBH30 sanitizer (200–500 ppm), contact time 2–3 minutes, wipe, air dry.",
    method:
    "1. Remove food items.\n2. Clean & disinfect display area, inside, racks, door, handle, gasket.\n3. Wipe dry & return food.",
    frequency: "Daily",
  },
  { item: "Hot cabinet", equipment:
    "Gloves, tissue, scouring pad.\nBH30 sanitizer (200–500 ppm), contact time 2–3 minutes, wipe, air dry.",
    method:
    "1. Switch off & cool.\n2. Remove food particles.\n3. Clean & disinfect; wipe dry.",
    frequency: "Daily",
  },
  { item: "Garbage bins", equipment:
    "Gloves, face mask, long-handled brush.\nBH20 general purpose cleaner (30 ml in 600 ml water), contact time 2–3 minutes, wipe.",
    method:
    "1. Remove garbage & rinse inside.\n2. Scrub interior & exterior; wash.\n3. Rinse & dry; place polyethylene liner.",
    frequency: "Weekly",
  },
  { item: "Stainless steel cabinets", equipment:
    "Gloves, tissue.\nBH30 sanitizer (200–500 ppm), contact time 2–3 minutes, wipe, air dry.",
    method:
    "1. Wipe cabinet.\n2. Clean & disinfect inside & outside.\n3. Wipe dry.",
    frequency: "Weekly",
  },
  { item: "Chest/Standing storage freezers", equipment:
    "Gloves, tissue, brush, scouring pad.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), contact 2–3 m, wipe, air dry.",
    method:
    "1. Shift food to another freezer.\n2. Switch off power; remove racks.\n3. Wash racks; rinse & sanitize.\n4. Remove accumulated ice.\n5. Sanitize interior & exterior incl. handle.\n6. Power on to ≤ -18°C; return food.",
    frequency: "Twice a Month",
  },
  { item: "Electric deep fryer", equipment:
    "Gloves, towel, scrapper, scouring pad, tissue.\nBH32 Degreaser (2–5 min), rinse.",
    method:
    "1. Unplug & let oil cool.\n2. Drain oil (store/dispose properly).\n3. Remove frying basket; scrub with degreaser; rinse & dry.\n4. Wipe exterior to remove oil residue; use scrapper if needed.\n5. Degrease heating element.\n6. Scrub interior with degreaser; rinse till soap-free.",
    frequency: "Twice a week",
  },
  { item: "Mincer Machine", equipment:
    "Gloves, scouring pad, tissue.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), contact 2–3 m, wipe, air dry.",
    method:
    "As necessary:\n1. Unplug; remove food particles; spray sanitizer; wipe.\nEnd of day:\n1. Unplug; dismantle (die plate, blade set...)\n2. Wash parts with soap & water; scrub inside mouth.\n3. Rinse & sanitize; dry.\n4. Clean & disinfect body; wipe.",
    frequency: "Daily",
  },
  { item: "Slicer Machine", equipment:
    "Gloves, scouring pad, tissue.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), contact 2–3 m, wipe, air dry.",
    method:
    "As necessary:\n1. Unplug; remove food particles; spray sanitizer; wipe.\nEnd of day:\n1. Wash/scrub parts & blade with soap; rinse & sanitize; dry.\n2. Clean & disinfect body; wipe.",
    frequency: "Daily",
  },
  { item: "Bone Saw Machine", equipment:
    "Gloves, scouring pad, tissue.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), contact 2–3 m, wipe, air dry.",
    method:
    "As necessary: unplug, remove particles, spray sanitizer, wipe.\nEnd of day: remove saw blade, wash & sanitize; air dry; clean rest of machine; rinse/wipe; sanitize; reassemble.",
    frequency: "Daily",
  },
  { item: "Microwave oven", equipment:
    "Gloves, scouring pad, tissue.\nBH30 sanitizer (200–500 ppm), contact 2–3 m, wipe, air dry.",
    method:
    "1. Remove food particles inside.\n2. Wipe interior/exterior.\n3. Disinfect interior/exterior incl. handle.",
    frequency: "Daily",
  },
  { item: "Hot Plate", equipment:
    "Gloves, scouring pad, tissue.\nBH32 Degreaser (2–5 m), rinse.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "1. Unplug & cool.\n2. Clean & scrub with soap/degreaser.\n3. Rinse/wipe; sanitize; dry.",
    frequency: "Daily",
  },
  { item: "Shawarma drip tray & skewer", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH32 Degreaser (2–5 m), rinse.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "1. Remove food particles.\n2. Wash & scrub with soap/degreaser; rinse.\n3. Air dry; sanitize; dry.",
    frequency: "Daily",
  },
  { item: "Chicken Roasting Machine", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH32 Degreaser (2–5 m), rinse.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "1. Remove food particles; dismantle removable parts (skewers, drip tray, glass slides).\n2. Wash/scrub parts with soap/degreaser; rinse; air dry; sanitize; dry.",
    frequency: "Daily",
  },
  { item: "Sausage Machine", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Unplug, dismantle (cover, pipe, nozzles, trays, hopper). Remove particles. Clean/scrub interior & exterior; rinse/wipe; sanitize; assemble.",
    frequency: "After each batch of production",
  },
  { item: "Mortadella Machine", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Unplug, dismantle (hopper, nozzles). Remove particles. Clean/scrub interior/exterior; rinse/wipe; sanitize; assemble.",
    frequency: "After each batch of production",
  },
  { item: "Meat Drying Cabinet", equipment:
    "Gloves, scrubbing pad, tissue.\nBH32 Degreaser (2–5 m), rinse.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Unplug. Remove particles. Clean/scrub interior & exterior; rinse/wipe; sanitize (per manufacturer guidance).",
    frequency: "After each batch of production",
  },
  { item: "Cooking Cabinet", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH32 Degreaser (2–5 m), rinse.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Unplug. Remove particles. Clean/scrub interior & exterior; rinse/wipe; sanitize (per manufacturer guidance).",
    frequency: "After each batch of production",
  },
  { item: "Burger Maker Mould", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Remove particles. Clean & scrub with soap & water; rinse. Sanitize with trigger spray; allow to dry.",
    frequency: "After each batch of production",
  },
  { item: "Stainless-steel kitchen hood filters", equipment:
    "Gloves, scrubbing pad, brush, towel.\nBH32 Degreaser (2–5 m), rinse.",
    method:
    "1. Remove filters; scrub & wash; rinse; air dry or towel dry.\n2. Scrub & wash interior/exterior of hood; wipe clean.",
    frequency: "Daily",
  },
  { item: "Worktop table", equipment:
    "Gloves, scouring pad, tissue, brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "After each prep:\n1. Remove dirt.\n2. Spray sanitizer & wipe.\nEnd of day:\n1. Wipe → scrub/wash → wipe → sanitize → wipe.",
    frequency: "Daily",
  },
  { item: "Hand wash sink", equipment:
    "Gloves, towel, scrubbing pad.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.",
    method:
    "Scrub & wash basins; rinse; wipe counter with clean towel/tissue.",
    frequency: "Daily",
  },
  { item: "Plastic/SS food containers", equipment:
    "Gloves, scouring pad, hand brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Remove dirt/food. Wash & scrub interior/exterior; rinse; air dry.",
    frequency: "Daily",
  },
  { item: "Cutting board", equipment:
    "Gloves, scouring pad/hard brush/scrapper.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "After each prep: remove dirt, spray sanitizer, wipe.\nEnd of shift: remove particles, rinse, scrub & wash, rinse, sanitize, air dry.",
    frequency: "Daily",
  },
  { item: "Knife", equipment:
    "Gloves, scouring pad, tissue.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "After each prep: remove dirt, spray sanitizer, wipe.\nEnd of shift: rinse, scrub & wash, rinse, sanitize, air dry.",
    frequency: "Daily",
  },
  { item: "Knife sterilizer", equipment:
    "Towel, tissue.\nBH30 sanitizer (200–500 ppm), contact 2–3 m, wipe, air dry.",
    method:
    "Turn off & unplug; wipe surfaces with wet towel; wipe with sanitizer.",
    frequency: "Weekly",
  },
  { item: "Kitchen Utensils", equipment:
    "Gloves, scrubbing pad, brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Rinse → scrub/wash → rinse → sanitize → air dry.",
    frequency: "Daily",
  },
  { item: "Plastic crates", equipment:
    "Gloves, scrapper, scouring pad, hand brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Remove stubborn stains with scrapper. Wash/scrub interior/exterior thoroughly. Rinse. Sanitize. Air dry.",
    frequency: "Daily",
  },
  { item: "Grill trays", equipment:
    "BH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH32 Degreaser (2–5 m), rinse.",
    method:
    "Immerse in soap solution. Scrub & wash with soap/degreaser to remove dirt. Rinse & air dry.",
    frequency: "Daily",
  },
  { item: "Stainless steel trolleys", equipment:
    "Gloves, scrubbing pad, brush.\nBH34/BH35 Manual Pot Wash (30 ml/L), rinse, air dry.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Remove dirt/particles. Scrub & wash with soap & water. Rinse. Sanitize. Dry.",
    frequency: "Daily",
  },
  { item: "Wrapping machine", equipment:
    "Scrapper, towel/tissue.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Turn off & unplug. Cool. Remove stickers/dirt with scrapper. Wipe with sanitizer & tissue.",
    frequency: "Daily",
  },
  { item: "Packing Machine", equipment:
    "Gloves, towel/tissue.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Wipe machine exterior & interior with sanitizer; ensure contact time; wipe/air dry.",
    frequency: "Daily",
  },
  { item: "Weighing scale", equipment:
    "Gloves, towel/tissue.\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe, air dry.",
    method:
    "Wipe platform & exterior until clean; wipe with sanitizer.",
    frequency: "Daily",
  },
  { item: "Drain", equipment:
    "Face mask, gloves, brush.\nBH20 general purpose cleaner (30 ml in 600 ml water), contact 2–3 m, wipe.\nDisinfectant/Bleach.",
    method:
    "Wear disposable gloves. Remove cover & debris. Wash & scrub cover with GP cleaner. Scrub interior. Rinse. Disinfect/bleach to leave drain disinfected.",
    frequency: "Twice a week",
  },
  { item: "Floor/Walls/Door", equipment:
    "Gloves, towel, brush & dustpan, mop, scrapper.\nBH20 general purpose cleaner (30 ml in 600 ml water).\nBH30 sanitizer (200–500 ppm), 2–3 m, wipe/air dry.",
    method:
    "Remove stickers/stains with scrapper. Remove dust & apply GP cleaner to all surfaces. Clean floor using mop-bucket. Wipe door & disinfect handle. Use squeegee/rinse/wipe clean.",
    frequency: "Daily / Weekly",
  },
];

/* Helper to build one editable row state */
function makeRowFromDocRow(docRow, month) {
  return {
    item: docRow.item,
    equipment: docRow.equipment,
    method: docRow.method,
    frequency: docRow.frequency,
    proposed: { W1: "", W2: "", W3: "", W4: "" },
    dateOfCleaning: "",
    cleanedBy: "",
    monitoredBy: "",
    month,
  };
}

export default function CleaningProgrammeScheduleInput() {
  /* Month (monthly report) */
  const monthFromQuery = normalizeMonth(getQueryParam("month"));
  const [monthText, setMonthText] = useState(() => {
    if (monthFromQuery) return monthFromQuery;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    } catch {
      return "";
    }
  });

  const [classification, setClassification] = useState("Official");
  const [location] = useState("BUTCHERY");
  const [revDate, setRevDate] = useState("");
  const [revNo, setRevNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  /* Modal */
  const [saveStage, setSaveStage] = useState("idle"); // idle | saving | done | error
  const [saveError, setSaveError] = useState("");

  /* existing report state (for updates) */
  const [existingId, setExistingId] = useState(null);

  /* Table rows */
  const [rows, setRows] = useState(() => SCHEDULE_ROWS.map((r) => makeRowFromDocRow(r, monthText)));

  /* col widths */
  const colDefs = useMemo(() => ([
    <col key="item" style={{ width: 220 }} />,
    <col key="equipment" style={{ width: 300 }} />,
    <col key="method" style={{ width: 460 }} />,
    <col key="freq" style={{ width: 160 }} />,
    <col key="date" style={{ width: 140 }} />,
    <col key="cleaned" style={{ width: 160 }} />,
    <col key="monitored" style={{ width: 160 }} />,
  ]), []);

  /* uniqueKey شهري */
  const uniqueKey = useMemo(() => `${TYPE}__${BRANCH}__${monthText || "unknown"}`, [monthText]);

  /* draft load/persist */
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (d && d.type === TYPE && d.monthText === monthText) {
        setClassification(d.classification || "Official");
        setRevDate(d.revDate || "");
        setRevNo(d.revNo || "");
        if (Array.isArray(d.rows) && d.rows.length) setRows(d.rows);
      }
    } catch {}
    // eslint-disable-next-line
  }, [monthText]);

  useEffect(() => {
    const payload = { type: TYPE, monthText, classification, rows, revDate, revNo };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [monthText, classification, rows, revDate, revNo]);

  useEffect(() => {
    setRows((prev) => prev.map((r) => ({ ...r, month: monthText })));
  }, [monthText]);

  /* ===== API helpers (robust upsert) ===== */

  // فلترة صارمة حسب uniqueKey + النوع + الفرع حتى لو الـ API رجع أكثر من عنصر
  async function apiGetByUniqueKey(uKey) {
    try {
      const res = await fetch(`${API_BASE}/api/reports?uniqueKey=${encodeURIComponent(uKey)}`, { cache: "no-store" });
      if (!res.ok) return null;

      const raw = await res.json().catch(() => ({}));
      const arr = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : raw
        ? [raw]
        : [];

      const hit = arr.find(
        (r) =>
          r?.uniqueKey === uKey &&
          r?.type === TYPE &&
          ((r?.payload?.branch || r?.branch) === BRANCH)
      );

      return hit || null;
    } catch {
      return null;
    }
  }

  async function findExistingForMonth(mm) {
    const monthNorm = normalizeMonth(mm);
    const uKey = `${TYPE}__${BRANCH}__${monthNorm}`;

    // 1) محاولة عبر uniqueKey (مع فلترة صارمة)
    const byUK = await apiGetByUniqueKey(uKey);
    if (byUK) return byUK;

    // 2) رجوع للخطة العامة: هات كل النوع وفلتر محليًا
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) return null;

      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const matches = list.filter((r) => {
        const p  = r?.payload || {};
        const br = p.branch || r.branch;
        const m  = normalizeMonth(p.month);
        return r?.type === TYPE && br === BRANCH && m === monthNorm;
      });

      matches.sort((a, b) => {
        const ta = Date.parse(a?.updatedAt || a?.createdAt || a?.payload?.createdAtClient || 0);
        const tb = Date.parse(b?.updatedAt || b?.createdAt || b?.payload?.createdAtClient || 0);
        return tb - ta;
      });

      return matches[0] || null;
    } catch {
      return null;
    }
  }

  async function loadMonth(mm = monthText) {
    const monthNorm = normalizeMonth(mm);
    setMsg("Loading month…");
    setExistingId(null);
    try {
      const existing = await findExistingForMonth(monthNorm);
      if (existing) {
        const p = existing.payload || {};
        setClassification(p.classification || "Official");
        setRevDate(p.revDate || "");
        setRevNo(p.revNo || "");
        setRows(
          Array.isArray(p.schedule) && p.schedule.length
            ? p.schedule.map((r) => ({ ...r, month: monthNorm }))
            : SCHEDULE_ROWS.map((r) => makeRowFromDocRow(r, monthNorm))
        );
        setExistingId(existing._id || existing.id || null);
        setMsg("✅ Loaded existing report for this month.");
      } else {
        setRows(SCHEDULE_ROWS.map((r) => makeRowFromDocRow(r, monthNorm)));
        setClassification("Official");
        setRevDate("");
        setRevNo("");
        setExistingId(null);
        setMsg("No existing report. Starting a new one.");
      }
    } catch {
      setMsg("Failed to load. Starting a new one.");
      setExistingId(null);
      setRows(SCHEDULE_ROWS.map((r) => makeRowFromDocRow(r, monthNorm)));
    }
  }

  useEffect(() => {
    loadMonth(monthText);
    // eslint-disable-next-line
  }, [monthText]);

  function updateRow(idx, field, value) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function updateProposed(idx, wkey, value) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], proposed: { ...(next[idx].proposed || {}), [wkey]: value } };
      return next;
    });
  }

  async function robustUpdateById(id, bodyFull, bodyLite) {
    // 1) PUT /:id
    try {
      const resPut = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyFull),
      });
      if (resPut.ok) return { ok: true, where: "PUT /:id" };
      if (resPut.status !== 404 && resPut.status !== 405) {
        const err = await resPut.json().catch(()=>({}));
        return { ok: false, msg: err?.error || `Update failed (HTTP ${resPut.status})` };
      }
    } catch {}

    // 2) PATCH /:id
    try {
      const resPatch = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyLite),
      });
      if (resPatch.ok) return { ok: true, where: "PATCH /:id" };
      if (resPatch.status !== 404 && resPatch.status !== 405) {
        const err = await resPatch.json().catch(()=>({}));
        return { ok: false, msg: err?.error || `Update failed (HTTP ${resPatch.status})` };
      }
    } catch {}

    return { ok: false, msg: "NotFound/MethodNotAllowed" };
  }

  async function robustUpsertByUniqueKey(uKey, fullBody) {
    // 1) PUT ?uniqueKey=...
    try {
      const resPutQ = await fetch(`${API_BASE}/api/reports?uniqueKey=${encodeURIComponent(uKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullBody),
      });
      if (resPutQ.ok) return { ok: true, where: "PUT ?uniqueKey" };
    } catch {}

    // 2) POST (create) مع معالجة 409
    try {
      const resPost = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullBody),
      });
      if (resPost.ok) return { ok: true, where: "POST" };
      if (resPost.status === 409) {
        const existed = await apiGetByUniqueKey(uKey);
        const id = existed?._id || existed?.id;
        if (id) {
          const lite = { payload: fullBody.payload };
          const r = await robustUpdateById(id, fullBody, lite);
          if (r.ok) return { ok: true, where: r.where + " after 409" };
          return { ok: false, msg: r.msg || "Update after 409 failed." };
        }
      }
      const err = await resPost.json().catch(()=>({}));
      return { ok: false, msg: err?.error || `Save failed (HTTP ${resPost.status})` };
    } catch (e) {
      return { ok: false, msg: e?.message || "POST failed" };
    }
  }

  async function handleSave() {
    setMsg("");
    setSaveError("");
    setSaveStage("saving");
    setSaving(true);

    const payload = {
      formRef: "UC/HACCP/BR/F13A-1",
      classification,
      location,
      month: monthText, // YYYY-MM
      revDate,
      revNo,
      standard: "Free of dirt, grease, and food debris",
      createdAtClient: firstDayIsoWithOffset(monthText), // اليوم الأول من الشهر
      schedule: rows,
      branch: BRANCH,
    };

    const fullBody = {
      reporter: "pos19",
      type: TYPE,
      uniqueKey,
      payload,
    };
    const liteBody = { payload };

    try {
      if (existingId) {
        const upd = await robustUpdateById(existingId, fullBody, liteBody);
        if (upd.ok) {
          setMsg("✅ Updated successfully.");
          setSaveStage("done");
          setTimeout(() => setSaveStage("idle"), 1200);
          setSaving(false);
          return;
        }
      }

      const up = await robustUpsertByUniqueKey(uniqueKey, fullBody);
      if (up.ok) {
        const existed = await apiGetByUniqueKey(uniqueKey);
        setExistingId(existed?._id || existed?.id || null);
        setMsg("✅ Saved/Updated successfully.");
        setSaveStage("done");
        setTimeout(() => setSaveStage("idle"), 1200);
      } else {
        throw new Error(up.msg || "Save/Update failed.");
      }
    } catch (e) {
      setMsg(`❌ ${e.message || "Save failed."}`);
      setSaveError(e.message || "Save failed.");
      setSaveStage("error");
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (!window.confirm("Clear all rows and header fields for this month?")) return;
    setRows(SCHEDULE_ROWS.map((r) => makeRowFromDocRow(r, monthText)));
    setClassification("Official");
    setRevDate("");
    setRevNo("");
    setMsg("Cleared.");
  }

  /* Modal UI */
  const Modal = ({ stage, error }) => {
    if (stage === "idle") return null;
    const isSaving = stage === "saving";
    const isDone   = stage === "done";
    const isErr    = stage === "error";
    return (
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999
      }}>
        <div style={{
          background:"#fff", borderRadius:12, padding:"18px 20px", minWidth:320,
          boxShadow:"0 12px 30px rgba(0,0,0,.2)", textAlign:"center"
        }}>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>
            {isSaving ? "جاري الحفظ…" : isDone ? "تم الحفظ ✅" : "فشل الحفظ ❌"}
          </div>
          <div style={{ color:"#4b5563", fontSize:13 }}>
            {isSaving && "الرجاء الانتظار لحظات"}
            {isDone && "تم تسجيل/تحديث الجدول لهذا الشهر."}
            {isErr  && (error || "حاول مرة أخرى.")}
          </div>
        </div>
      </div>
    );
  };

  /* Header line */
  const HeaderLine = ({ label, children }) => (
    <div style={{ display:"contents" }}>
      <div style={{ padding: "6px 8px", fontWeight: 700 }}>{label}</div>
      <div style={{ border:"1px solid #1f3b70", padding:"6px 8px" }}>{children}</div>
    </div>
  );

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      <Modal stage={saveStage} error={saveError} />

      {/* Top bar */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
        <div style={{ fontWeight:900 }}>Cleaning Programme Schedule — Input (Monthly)</div>
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <input
            type="month"
            value={monthText}
            onChange={(e)=>setMonthText(e.target.value)}
            style={{ ...inputStyle, width: 160, minHeight: 0, padding: "6px 8px" }}
          />
          <button onClick={()=>loadMonth(monthText)} style={btnStyle("#0ea5e9")}>Load Month</button>
          {existingId ? (
            <span style={{ fontWeight:700, color:"#059669" }}>• Existing report detected (edit mode)</span>
          ) : (
            <span style={{ fontWeight:700, color:"#6b7280" }}>• New report for this month</span>
          )}
        </div>
      </div>

      {/* Header block */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(6, minmax(0,1fr))",
        gap:8,
        marginBottom:10,
        alignItems:"center",
        fontSize:12,
      }}>
        <div style={{ gridColumn:"span 6 / span 6", fontWeight:900, fontSize:16, textAlign:"center" }}>
          CLEANING PROGRAMME SCHEDULE
        </div>

        <HeaderLine label="Union Coop Form Ref. No:">UC/HACCP/BR/F13A-1</HeaderLine>
        <HeaderLine label="Cleaning Program Schedule (Butchery)">Classification :
          <input
            value={classification}
            onChange={(e)=>setClassification(e.target.value)}
            style={{ ...inputStyle, borderColor:"#1f3b70", display:"inline-block", width:"auto", marginLeft:8 }}
          />
        </HeaderLine>
        <HeaderLine label="Month:">
          <input
            type="month"
            value={monthText}
            onChange={(e)=>setMonthText(e.target.value)}
            style={{ ...inputStyle, borderColor:"#1f3b70" }}
          />
        </HeaderLine>
        <HeaderLine label="Page">1 of 11</HeaderLine>
        <HeaderLine label="Rev. Date:">
          <input
            placeholder="(optional)"
            value={revDate}
            onChange={(e)=>setRevDate(e.target.value)}
            style={{ ...inputStyle, borderColor:"#1f3b70" }}
          />
        </HeaderLine>
        <HeaderLine label="Rev. No:">
          <input
            placeholder="(optional)"
            value={revNo}
            onChange={(e)=>setRevNo(e.target.value)}
            style={{ ...inputStyle, borderColor:"#1f3b70" }}
          />
        </HeaderLine>
        <HeaderLine label="Location">{location}</HeaderLine>
      </div>

      {/* Standard line */}
      <div style={{
        border:"1px solid #1f3b70",
        marginBottom:10,
        padding:"6px 8px",
        fontSize:12,
        fontWeight:700,
        background:"#f5f8ff"
      }}>
        Standard  Free of dirt, grease, and food debris
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Item/Area{"\n"}to Clean</th>
              <th style={thCell}>Equipment / Chemical</th>
              <th style={thCell}>Cleaning Method</th>
              <th style={thCell}>Frequency &{"\n"}Proposed Date{"\n"}W1 • W2 • W3 • W4</th>
              <th style={thCell}>Date of{"\n"}Cleaning</th>
              <th style={thCell}>Cleaned{"\n"}By</th>
              <th style={thCell}>Monitored{"\n"}By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>{r.item}</div>
                  <input
                    value={r.item}
                    onChange={(e)=>updateRow(idx,"item",e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <textarea
                    value={r.equipment}
                    onChange={(e)=>updateRow(idx,"equipment",e.target.value)}
                    style={{ ...inputStyle, minHeight: 120, resize:"vertical" }}
                  />
                </td>
                <td style={tdCell}>
                  <textarea
                    value={r.method}
                    onChange={(e)=>updateRow(idx,"method",e.target.value)}
                    style={{ ...inputStyle, minHeight: 140, resize:"vertical" }}
                  />
                </td>
                <td style={tdCell}>
                  <div style={{ marginBottom:6, fontWeight:700 }}>{r.frequency}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:6, alignItems:"center" }}>
                    <div>W1</div>
                    <input type="date" value={r.proposed.W1||""} onChange={(e)=>updateProposed(idx,"W1",e.target.value)} style={inputStyle} />
                    <div>W2</div>
                    <input type="date" value={r.proposed.W2||""} onChange={(e)=>updateProposed(idx,"W2",e.target.value)} style={inputStyle} />
                    <div>W3</div>
                    <input type="date" value={r.proposed.W3||""} onChange={(e)=>updateProposed(idx,"W3",e.target.value)} style={inputStyle} />
                    <div>W4</div>
                    <input type="date" value={r.proposed.W4||""} onChange={(e)=>updateProposed(idx,"W4",e.target.value)} style={inputStyle} />
                  </div>
                </td>
                <td style={tdCell}>
                  <input
                    type="date"
                    value={r.dateOfCleaning||""}
                    onChange={(e)=>updateRow(idx,"dateOfCleaning",e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    value={r.cleanedBy||""}
                    onChange={(e)=>updateRow(idx,"cleanedBy",e.target.value)}
                    placeholder="Name / Signature"
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    value={r.monitoredBy||""}
                    onChange={(e)=>updateRow(idx,"monitoredBy",e.target.value)}
                    placeholder="Name / Signature"
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : existingId ? "Update Month" : "Save Month"}
        </button>
        <button onClick={handleClear} style={btnStyle("#6b7280")}>Clear</button>
        {msg && <span style={{ fontSize:13, fontWeight:700, padding:"8px 6px" }}>{msg}</span>}
      </div>
    </div>
  );
}
