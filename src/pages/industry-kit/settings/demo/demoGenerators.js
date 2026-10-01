// src/pages/industry-kit/settings/demo/demoGenerators.js
// Realistic sample records for a DEMO kit company — what a sales call shows:
// three weeks of daily sheets filled the way a good kitchen fills them, with
// the odd failure that was caught and corrected, one open non-conformity, a
// fryer whose oil gets changed on schedule, OHC cards and training certificates.
//
// Pure data, no React and no network: buildDemoPlan() returns the records and
// DemoDataPanel.jsx sends them. Every payload carries `_demo: true` so the
// panel can find and delete exactly what it created, and nothing else.
//
// Values are generated FROM the schemas (industries/_kit), then run through
// each table's own check(): a row meant to pass is regenerated until it does,
// so a schema limit changing later never turns the demo red by accident.
// The names, suppliers and numbers are invented.

import { kitSchemasFor, registerTypesFor } from "../../../../industries/_kit/kitRegistry";
import { summarize, withComputed } from "../../log/rows";

export const DEMO_MARK = "_demo";

/* ───────── seeded randomness (same company + day → same data) ───────── */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function rngFor(...parts) {
  const r = mulberry32(hashStr(parts.join("|")));
  const api = {
    next: r,
    int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
    num: (lo, hi, dp = 1) => Number((lo + r() * (hi - lo)).toFixed(dp)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
    some: (arr, n) => [...arr].sort(() => r() - 0.5).slice(0, n),
  };
  return api;
}

/* ───────── dates & times ───────── */
const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const hhmm = (mins) => `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`;
const toMins = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const dayIndex = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 864e5);

/* ───────── invented people and businesses ───────── */
export const STAFF = [
  { no: "E101", name: "Ahmed Saleh", nat: "Egyptian", job: "Head Chef" },
  { no: "E102", name: "Ravi Kumar", nat: "Indian", job: "Sous Chef" },
  { no: "E103", name: "Maria Santos", nat: "Filipino", job: "Commis Chef" },
  { no: "E104", name: "Omar Haddad", nat: "Jordanian", job: "Line Cook" },
  { no: "E105", name: "Sanjay Patel", nat: "Indian", job: "Line Cook" },
  { no: "E106", name: "Grace Wanjiru", nat: "Kenyan", job: "Pastry Cook" },
  { no: "E107", name: "Bilal Akhtar", nat: "Pakistani", job: "Kitchen Steward" },
  { no: "E108", name: "Jomar Reyes", nat: "Filipino", job: "Kitchen Steward" },
  { no: "E109", name: "Nour Khalil", nat: "Lebanese", job: "Storekeeper" },
  { no: "E110", name: "Samir Mansour", nat: "Syrian", job: "Waiter" },
];
const QA = "Lina Farouk";            // the company's food-safety officer
const SUPERVISORS = ["Ahmed Saleh", "Ravi Kumar"];
const CHEFS = ["Ahmed Saleh", "Ravi Kumar", "Maria Santos", "Omar Haddad", "Sanjay Patel"];
const STEWARDS = ["Bilal Akhtar", "Jomar Reyes"];

const SUPPLIES = [
  { supplier: "Green Valley Produce", product: "Lettuce & salad leaves", storage: "Chilled", unit: "kg", qty: [8, 20], life: [4, 7] },
  { supplier: "Green Valley Produce", product: "Tomatoes", storage: "Chilled", unit: "kg", qty: [15, 30], life: [6, 10] },
  { supplier: "Golden Wing Poultry", product: "Fresh chicken breast", storage: "Chilled", unit: "kg", qty: [20, 45], life: [4, 6] },
  { supplier: "Golden Wing Poultry", product: "Whole chicken", storage: "Chilled", unit: "kg", qty: [25, 50], life: [4, 6] },
  { supplier: "Crescent Meats", product: "Lamb shoulder", storage: "Chilled", unit: "kg", qty: [10, 25], life: [5, 8] },
  { supplier: "Crescent Meats", product: "Frozen beef mince", storage: "Frozen", unit: "kg", qty: [15, 30], life: [150, 300] },
  { supplier: "Blue Harbour Seafood", product: "Frozen shrimp", storage: "Frozen", unit: "kg", qty: [8, 15], life: [200, 360] },
  { supplier: "Pure Dairy Co.", product: "Fresh milk", storage: "Chilled", unit: "L", qty: [20, 40], life: [5, 8] },
  { supplier: "Pure Dairy Co.", product: "Labneh & yoghurt", storage: "Chilled", unit: "kg", qty: [8, 16], life: [10, 20] },
  { supplier: "Sahara Dry Goods", product: "Basmati rice", storage: "Dry", unit: "kg", qty: [50, 100], life: [300, 500] },
  { supplier: "Sahara Dry Goods", product: "Cooking oil", storage: "Dry", unit: "L", qty: [40, 80], life: [200, 400] },
  { supplier: "Sahara Dry Goods", product: "Flour", storage: "Dry", unit: "kg", qty: [25, 50], life: [150, 250] },
];

const CLEANING = [
  { area: "Cooking line & ranges", task: "Degrease & sanitise", chemical: "Degreaser D-10", dilution: "1:20" },
  { area: "Prep tables", task: "Wash, rinse, sanitise", chemical: "Quat sanitiser", dilution: "200 ppm" },
  { area: "Cutting boards", task: "Wash & sanitise", chemical: "Quat sanitiser", dilution: "200 ppm" },
  { area: "Walk-in chiller", task: "Floor & shelves", chemical: "Neutral detergent", dilution: "1:50" },
  { area: "Floors & drains", task: "Scrub & disinfect", chemical: "Chlorine", dilution: "100 ppm" },
  { area: "Hand-wash sinks", task: "Clean & restock soap", chemical: "Neutral detergent", dilution: "1:50" },
  { area: "Extraction hood filters", task: "Soak & degrease", chemical: "Degreaser D-10", dilution: "1:10" },
];

const COLD_UNITS = [
  { unit: "Walk-in Chiller 1", unitType: "Chiller (≤ 5 °C)" },
  { unit: "Walk-in Freezer", unitType: "Freezer (≤ −18 °C)" },
  { unit: "Reach-in Chiller — Line", unitType: "Chiller (≤ 5 °C)" },
  { unit: "Salad Bar", unitType: "Display chiller (≤ 5 °C)" },
  { unit: "Dessert Freezer", unitType: "Display freezer (≤ −18 °C)" },
];

const DISHES = ["Grilled chicken", "Chicken biryani", "Lamb ouzi", "Beef lasagne", "Fish fillet", "Mixed grill", "Mutton curry", "Chicken shawarma", "Lentil soup", "Stuffed vine leaves"];
const AREAS = ["Kitchen", "Dry store", "Walk-in chiller", "Dish area", "Receiving bay", "Waste area"];

const ROOT_ACTIONS = [
  { area: "Walk-in chiller", description: "Door gasket torn — door not sealing", severity: "Major", rootCause: "Wear; not in maintenance plan", action: "Gasket replaced; added to monthly PM checklist", responsible: "Maintenance" },
  { area: "Kitchen", description: "Unlabelled container of sauce in reach-in chiller", severity: "Minor", rootCause: "New staff not trained on labelling", action: "Discarded; labelling refresher given to line staff", responsible: "Ahmed Saleh" },
  { area: "Receiving bay", description: "Chilled delivery received at 8 °C", severity: "Major", rootCause: "Supplier truck chiller fault", action: "Delivery rejected; supplier warned in writing", responsible: QA },
  { area: "Dish area", description: "Final-rinse temperature low (78 °C)", severity: "Major", rootCause: "Booster heater element scaled", action: "Technician descaled booster; readings back ≥ 82 °C", responsible: "Maintenance" },
  { area: "Dry store", description: "Sacks stored directly on the floor", severity: "Minor", rootCause: "Pallet shortage after large delivery", action: "Extra pallets bought; stock moved off floor", responsible: "Nour Khalil" },
];

/* ───────── per-report generators (key → (ctx) → rows) ─────────
   ctx: { day, idx, r (rng), last (is today), bad (make one row fail) } */
const time = (r, from, to) => hhmm(r.int(toMins(from), toMins(to)));

const SPECIFIC = {
  /* — restaurant — */
  cooking: ({ r }) => r.some(DISHES, r.int(5, 7)).map((dish, i) => ({
    time: hhmm(toMins("11:00") + i * r.int(25, 50)),
    dish,
    process: /soup|biryani/i.test(dish) && r.chance(0.4) ? "Reheating" : "Cooking",
    core: r.num(76, 91),
    probe: r.pick(["TP-01", "TP-02"]),
    chef: r.pick(CHEFS),
    action: "",
  })),
  hot_holding: ({ r }) => [
    ["Bain-marie 1", "Chicken biryani"], ["Bain-marie 1", "Mutton curry"], ["Bain-marie 2", "Lentil soup"], ["Buffet line", "Mixed grill"],
  ].map(([unit, dish]) => ({ unit, dish, t1: r.num(68, 78), t2: r.num(65, 74), t3: r.num(63, 72), t4: r.num(62, 70), action: "None" })),
  cooling: ({ r }) => r.some(["Chicken biryani", "Beef lasagne", "Mutton curry", "Lentil soup", "Rice"], r.int(1, 3)).map((dish) => {
    const s = r.int(toMins("14:00"), toMins("16:00"));
    return {
      dish,
      startTime: hhmm(s), startTemp: r.num(62, 75),
      t2Time: hhmm(s + r.int(85, 115)), t2Temp: r.num(14, 20),
      t6Time: hhmm(s + r.int(250, 340)), t6Temp: r.num(2, 4.6),
      method: r.pick(["Blast chiller", "Blast chiller", "Shallow trays", "Ice bath"]),
      action: "",
    };
  }),
  thawing: ({ r, day, last }) => r.some(["Chicken breast", "Lamb shoulder", "Frozen shrimp", "Beef mince", "Fish fillet"], r.int(1, 3)).map((item) => ({
    item,
    qty: r.num(3, 12),
    method: r.chance(0.85) ? "Chiller (≤ 5 °C)" : "Cold running water (≤ 21 °C)",
    start: time(r, "16:00", "21:00"),
    startDate: day,
    endCore: r.num(1, 4.5),
    labelled: "Yes",
    refrozen: "No",
    status: last ? r.pick(["Thawing", "In chiller (thawed)"]) : "Used",
  })),
  frying_oil: ({ idx }) => ["Fryer 1", "Fryer 2"].map((fryer, i) => {
    const cycle = 6 + i;                    // oil lasts ~6–7 days
    const age = (idx + i * 3) % cycle;      // days since the last change
    const tpm = Number((9 + age * 2.6).toFixed(1));
    return { fryer, time: "10:30", tpm, colour: "Pass", changed: tpm >= 22 ? "Yes" : "No", checkedBy: "Ahmed Saleh" };
  }),
  dishwasher: ({ r }) => ["09:00", "15:00", "21:30"].map((t) => ({
    machine: "Dishwasher DW-1", time: t, wash: r.num(61, 68), rinse: r.num(82.5, 88), detergent: "Yes", action: "",
  })),

  /* — shared by every kit industry — */
  personal_hygiene: ({ r }) => r.some(STAFF.slice(0, 9), r.int(6, 8)).map((s) => ({
    name: s.name, empNo: s.no, position: s.job,
    uniform: "Yes", hair: "Yes", nails: "Yes", jewellery: "Yes", wounds: "N/A", illness: "None", handwash: "Yes", action: "",
  })),
  cleaning: ({ r }) => r.some(CLEANING, r.int(5, 7)).map((c) => ({
    time: time(r, "15:00", "23:30"), ...c, doneBy: r.pick(STEWARDS), visual: "Pass", action: "",
  })),
  temperature: ({ r }) => COLD_UNITS.map((u) => {
    const frozen = /Freezer|freezer/.test(u.unitType);
    const t = () => (frozen ? r.num(-22, -18.6) : r.num(1.2, 4.4));
    return { ...u, am: t(), noon: t(), pm: t(), door: "Yes", action: "" };
  }),
  receiving: ({ r, day }) => r.some(SUPPLIES, r.int(3, 5)).map((s, i) => ({
    time: hhmm(toMins("07:00") + i * r.int(30, 60)),
    supplier: s.supplier,
    product: s.product,
    storage: s.storage,
    batch: `${s.supplier.split(" ").map((w) => w[0]).join("")}-${day.slice(2).replace(/-/g, "")}-${r.int(10, 99)}`,
    expDate: addDays(day, r.int(...s.life)),
    qty: r.int(...s.qty),
    unit: s.unit,
    temp: s.storage === "Chilled" ? r.num(1.5, 4.5) : s.storage === "Frozen" ? r.num(-22, -18.5) : "",
    vehicle: "Yes", packaging: "Yes", label: "Yes", decision: "Accepted", remarks: "",
  })),
  pest_control: () => [
    ["BS-01", "Receiving bay", "Bait station"], ["BS-02", "Waste area", "Bait station"], ["GT-01", "Dry store", "Glue trap"],
    ["GT-02", "Kitchen", "Glue trap"], ["IC-01", "Kitchen entrance", "Insect-o-cutor"], ["VC-01", "Walk-in chiller", "Visual check"],
  ].map(([station, area, stationType]) => ({ station, area, stationType, intact: stationType === "Visual check" ? "N/A" : "Yes", activity: "None", pest: "", action: "" })),
  visitors: ({ r }) => r.some([
    ["Hassan Ali", "CoolTech HVAC Services", "Chiller maintenance"],
    ["Peter Mwangi", "SafeGuard Pest Control", "Monthly pest service"],
    ["Fatima Noor", "Green Valley Produce", "Supplier visit"],
    ["Daniel Cruz", "FireSafe Systems", "Hood fire-suppression check"],
  ], r.int(1, 2)).map(([name, company, purpose]) => {
    const tin = r.int(toMins("09:00"), toMins("14:00"));
    return { timeIn: hhmm(tin), name, company, purpose, health: "Yes", ppe: "Yes", escort: QA, timeOut: hhmm(tin + r.int(30, 120)) };
  }),
  staff_health: ({ r, day }) => {
    const s = r.pick(STAFF);
    return [{
      name: s.name, empNo: s.no, symptoms: r.pick(["Diarrhoea", "Fever", "Sore throat with fever"]), ohc: "Yes",
      decision: "Excluded from food handling", returnDate: addDays(day, r.int(2, 3)), clearance: "Yes",
      remarks: "Returned with doctor's fitness note",
    }];
  },
  non_conformance: ({ r, day, last }) => {
    const n = r.pick(ROOT_ACTIONS);
    return [{
      time: time(r, "09:00", "17:00"), ...n,
      due: addDays(day, r.int(2, 7)),
      status: last ? "In Progress" : "Closed",
    }];
  },
  waste: ({ r, day }) => r.some([
    ["Lettuce & salad leaves", "Quality defect", "kg", [1, 3]],
    ["Cooked rice (end of day)", "Expired", "kg", [2, 5]],
    ["Labneh & yoghurt", "Expired", "kg", [1, 2]],
    ["Tomatoes", "Damaged", "kg", [1, 4]],
    ["Bread rolls", "Expired", "pcs", [10, 30]],
  ], r.int(1, 2)).map(([product, reason, unit, q]) => ({
    time: time(r, "21:00", "23:00"), product, batch: `B-${day.slice(5).replace("-", "")}`, reason,
    qty: r.int(...q), unit, method: "Approved waste contractor", witness: QA,
  })),
  thermometer_check: ({ r }) => [["TP-01", "Cooking line"], ["TP-02", "Receiving bay"], ["TP-03", "Cold room"]].map(([probe, location]) => ({
    probe, location, ice: r.num(-0.5, 0.5), boil: r.num(99.4, 100.6), action: "None",
  })),
};

/* A failure caught on the day and corrected — keeps the demo honest. */
const MAKE_BAD = {
  cooking: (row) => ({ ...row, core: 71.5, action: "Returned to oven — re-probed at 82 °C" }),
  temperature: (row) => (/Chiller 1/.test(row.unit) ? { ...row, noon: 7.2, action: "Door left open during delivery — closed, re-checked 4.1 °C after 30 min" } : row),
  personal_hygiene: (row) => ({ ...row, jewellery: "No", action: "Watch removed before starting shift" }),
  dishwasher: (row) => ({ ...row, rinse: 78.4, action: "Booster heater reset — re-checked 84 °C" }),
  receiving: (row) => (row.storage === "Chilled"
    ? { ...row, temp: 8.1, decision: "Rejected", remarks: "Truck chiller faulty — returned to driver" }
    : row),
  hot_holding: (row) => ({ ...row, t3: 56.5, action: "Reheated to ≥ 75 °C" }),
  cleaning: (row) => ({ ...row, visual: "Fail", action: "Re-cleaned and re-inspected — pass" }),
};

/** How often each report is filled (default: every day). */
const CADENCE = {
  cooling: (i) => i % 2 === 0,
  thawing: (i) => i % 2 === 1,
  pest_control: (i) => i % 3 === 0,
  visitors: (i) => i % 4 === 1,
  staff_health: (i) => i === 9,
  non_conformance: (i, last) => last || i % 6 === 2,
  waste: (i) => i % 2 === 0,
  thermometer_check: (i) => i % 7 === 0,
  recall: (i) => i === 12,
  customer_complaints: (i) => i % 5 === 3,
  quarantine: (i) => i % 3 === 0,
};

/* ───────── generic filler (reports the specific table doesn't know) ───────── */
const TEXT_POOLS = [
  [/name|by|staff|operator|inspector|responsible|witness|escort|chef|checked|verified/i, STAFF.map((s) => s.name)],
  [/supplier/i, [...new Set(SUPPLIES.map((s) => s.supplier))]],
  [/product|item|dish|material/i, SUPPLIES.map((s) => s.product)],
  [/area|location|zone|section/i, AREAS],
  [/batch|lot/i, ["L-2041", "L-2042", "L-2043", "L-2050"]],
  [/vehicle|truck/i, ["DXB-K-45120", "DXB-M-77302"]],
];
function genericValue(col, r, day) {
  if (col.type === "computed") return "";
  if (col.type === "list") {
    return Array.from({ length: 2 }, () => Object.fromEntries(col.fields.map((f) => [f.key, genericValue(f, r, day)])));
  }
  if (col.type === "select") return col.options[0];
  if (col.type === "time") return time(r, "07:00", "21:00");
  if (col.type === "date") return /exp|due|best|use/i.test(col.key + col.label) ? addDays(day, r.int(5, 60)) : day;
  if (col.type === "number") {
    const h = String(col.hint || "").replace("−", "-");
    let m;
    if ((m = h.match(/(-?\d+(?:\.\d+)?)\s*…\s*(-?\d+(?:\.\d+)?)/))) return r.num(Number(m[1]), Number(m[2]));
    if ((m = h.match(/[≥>]\s*(-?\d+(?:\.\d+)?)/))) return r.num(Number(m[1]) + 1, Number(m[1]) + 8);
    if ((m = h.match(/[≤<]\s*(-?\d+(?:\.\d+)?)/))) { const v = Number(m[1]); return v <= 0 ? r.num(v - 4, v - 0.5) : r.num(v * 0.3, v * 0.85); }
    const l = `${col.label}`;
    if (/RH/i.test(l)) return r.int(45, 60);
    if (/°C/.test(l)) return r.num(1.5, 4.5);
    if (/ppm/i.test(l)) return r.num(0.3, 0.8, 2);
    if (/\bpH\b/.test(l)) return r.num(7, 7.6);
    if (/RLU/i.test(l)) return r.int(40, 140);
    if (/%/.test(l)) return r.num(0.5, 3);
    return r.int(5, 60);
  }
  const pool = TEXT_POOLS.find(([re]) => re.test(`${col.key} ${col.label}`));
  if (pool) return r.pick(pool[1]);
  if (/action|remark|note/i.test(col.key)) return "";
  return `${col.label} ${r.int(1, 9)}`;
}

const RESPONSES = ["", "Investigated and resolved — closed"];
const LEVEL = { ok: 0, warn: 1, fail: 2 };

/** One row the schema itself rates OK, or as close as the search gets:
 *  fresh numbers a few times, and for each pick-list (and the action text)
 *  the choice that scores best — e.g. a counter type that fits its readings. */
function genericRow(table, r, day, header) {
  const score = (row) => {
    const s = table.check ? table.check(withComputed(table, row), header) : null;
    return s ? LEVEL[s.level] ?? 0 : 0;
  };
  const choices = table.columns
    .map((c) => (c.type === "select" ? [c.key, c.options] : /action|response/i.test(`${c.key} ${c.label}`) && !c.type ? [c.key, RESPONSES] : null))
    .filter(Boolean);
  let best = null;
  let bestScore = 3;
  for (let i = 0; i < 6 && bestScore > 0; i += 1) {
    let row = Object.fromEntries(table.columns.map((c) => [c.key, genericValue(c, r, day)]));
    let sc = score(row);
    for (let pass = 0; pass < 2 && sc > 0; pass += 1) {
      for (const [key, opts] of choices) {
        for (const v of opts) {
          const cand = { ...row, [key]: v };
          const cs = score(cand);
          if (cs < sc) { row = cand; sc = cs; }
        }
      }
    }
    if (sc < bestScore) { best = row; bestScore = sc; }
  }
  return best;
}

/* ───────── the plan ───────── */
/**
 * Every record the demo needs for one kit industry.
 *   → [{ type, label, payload, day? }]
 * `days` sheets back from `today` (inclusive).
 */
export function buildDemoPlan(industry, { today, days = 21, companyKey = "" } = {}) {
  const plan = [];
  const schemas = kitSchemasFor(industry);
  const first = addDays(today, -(days - 1));

  schemas.forEach((schema) => {
    for (let i = 0; i < days; i += 1) {
      const day = addDays(first, i);
      const last = day === today;
      const idx = dayIndex(day);
      const cadence = CADENCE[schema.key];
      if (cadence && !cadence(i, last)) continue;

      const r = rngFor(companyKey, schema.type, day);
      const header = {
        shift: "Morning",
        checkedBy: r.pick(SUPERVISORS),
        verifiedBy: last ? "" : QA,         // today's sheets still await QA
      };
      const ctx = { day, idx, r, last };
      const payload = { reportDate: day, header, notes: "", savedAt: `${day}T${time(r, "18:00", "22:30")}:00.000Z`, [DEMO_MARK]: true };

      schema.tables.forEach((t) => {
        let rows = (SPECIFIC[schema.key] && schema.tables.length === 1)
          ? SPECIFIC[schema.key](ctx)
          : Array.from({ length: Math.min(t.defaultRows || 3, 4) }, () => genericRow(t, r, day, { ...header, reportDate: day }));
        // About one sheet in five shows a problem that was caught and fixed.
        if (MAKE_BAD[schema.key] && rows.length && !last && r.chance(0.2)) {
          const k = r.int(0, rows.length - 1);
          rows = rows.map((row, j) => (j === k ? MAKE_BAD[schema.key](row) : row));
        }
        payload[t.key] = rows.map((row) => withComputed(t, row));
      });
      payload.summary = summarize(schema, payload);
      plan.push({ type: schema.type, label: schema.label, day, payload });
    }
  });

  /* registers: OHC cards + external certificates */
  const reg = registerTypesFor(industry);
  STAFF.forEach((s, i) => {
    const r = rngFor(companyKey, "ohc", s.no);
    plan.push({
      type: reg.ohc,
      label: "OHC Certificate",
      payload: {
        appNo: s.no, name: s.name, nationality: s.nat, job: s.job, branch: "Main Branch", result: "FIT",
        // two cards run out soon — the register's expiry warning has something to show
        expiryDate: addDays(today, i < 2 ? r.int(10, 25) : r.int(90, 700)),
        savedAt: `${addDays(today, -r.int(30, 300))}T09:00:00.000Z`,
        [DEMO_MARK]: true,
      },
    });
  });
  const CERTS = [
    ["E101", "PIC", 5], ["E102", "PIC", 5], ["E101", "HACCP", 0], ["E109", "BFS", 2],
    ["E103", "BFS", 2], ["E104", "BFS", 2], ["E105", "BFS", 2], ["E106", "BFS", 2], ["E110", "FIRST_AID", 0],
  ];
  CERTS.forEach(([no, courseType, years]) => {
    const s = STAFF.find((x) => x.no === no);
    const r = rngFor(companyKey, "cert", no, courseType);
    const issueDate = addDays(today, -r.int(60, years ? years * 365 - 40 : 500));
    const exp = years ? addDays(issueDate, years * 365) : undefined;
    plan.push({
      type: reg.certificates,
      label: "External Certificate",
      payload: {
        employeeNo: s.no, name: s.name, nationality: s.nat, job: s.job, branch: "Main Branch",
        courseType, issueDate, expiryDate: exp, savedAt: `${issueDate}T10:00:00.000Z`, [DEMO_MARK]: true,
      },
    });
  });

  return plan;
}

/** The demo guard: only a company whose name says it is a demo. */
export const isDemoCompanyName = (name) => /demo|ديمو|تجريبي/i.test(String(name || ""));
