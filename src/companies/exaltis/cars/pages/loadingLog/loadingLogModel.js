// src/companies/exaltis/cars/pages/loadingLog/loadingLogModel.js
// Loading log — fields, labels, limits and row helpers.
// (Split out of LoadingLog.jsx — the code is unchanged.)

/* Arabic twins for the on-screen sheet only — the printed blank form and the
   saved payload stay English. */
export const CHECK_AR = {
  trafficControlSpotter: "تنظيم الحركة / مرشد",
  vehicleSecured: "تأمين المركبة (فرامل + مصدات)",
  loadSecured: "تأمين الحمولة (أحزمة + فحص)",
  areaSafe: "المنطقة آمنة (إنارة / مانع انزلاق / ممر)",
  manualHandlingControls: "ضوابط المناولة اليدوية",
  floorSealingIntact: "عزل الأرضية سليم",
  floorCleaning: "نظافة الأرضية",
  pestActivites: "نشاط حشرات",
  plasticCurtain: "الستارة البلاستيكية متوفرة / نظيفة",
  badOdour: "رائحة كريهة",
  ppeAvailable: "معدات الوقاية متوفرة",
};

export const GROUP_AR = { "Loading safety": "سلامة التحميل", "Vehicle hygiene": "نظافة المركبة" };

export const DEST_AR = { BRANCH: "فرع", "CUSTOMER DELIVERY": "توصيل عميل", "EVENT / CATERING": "مناسبة / تموين", WHOLESALE: "جملة", OTHER: "أخرى" };

/**
 * VISUAL INSPECTION (OUTBOUND CHECKLIST) - English-only
 * - Header kept as-is
 * - Multiple vehicles per single report date (rows you can add/remove)
 * - Saves report to server: POST /api/reports  { reporter, type, payload }
 *
 * Updates:
 * - INFORMED TO is optional (not required)
 * - VEHICLE NO + DRIVER NAME are dropdowns (no duplicates)
 * - Add buttons appear ONLY on first row
 * - New values are saved permanently on server (as lookup types)
 *
 * NEW (Loading/Unloading Safety Controls):
 * - TRAFFIC CONTROL / SPOTTER USED (Yes/No)
 * - VEHICLE SECURED (HANDBRAKE + CHOCKS) (Yes/No)
 * - LOAD SECURED (STRAPS + INSPECTION) (Yes/No)
 * - AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR) (Yes/No)
 * - MANUAL HANDLING CONTROLS APPLIED (Yes/No)
 */

export const TYPE = "sweets_cars_loading_inspection";

// Lookup types (saved on server permanently)
export const LOOKUP_VEHICLES_TYPE = "sweets_cars_loading_lookup_vehicle_numbers";

export const LOOKUP_DRIVERS_TYPE = "sweets_cars_loading_lookup_driver_names";

/* =========================
   DESTINATION (الوجهة) - required dropdown
========================= */
export const DESTINATIONS = [
  "BRANCH",
  "CUSTOMER DELIVERY",
  "EVENT / CATERING",
  "WHOLESALE",
  "OTHER",
];

/* =========================
   YES/NO fields (table)
========================= */
export const YESNO_FIELDS = [
  // NEW safety controls
  "trafficControlSpotter",     // Traffic control / spotter used
  "vehicleSecured",            // Handbrake + chocks
  "loadSecured",               // Straps + inspection
  "areaSafe",                  // Lighting/anti-slip/walkway clear
  "manualHandlingControls",    // Lifting aids/team lift/no overload

  // Existing food/vehicle hygiene items (keep as-is)
  "floorSealingIntact",
  "floorCleaning",
  "pestActivites", // keep sheet spelling
  "plasticCurtain",
  "badOdour",
  "ppeAvailable",
];

// INFORMED TO is optional => removed from required validation
export const REQUIRED_FIELDS = {
  vehicleNo: "VEHICLE NO",
  driverName: "DRIVER NAME",
  destination: "DESTINATION",
  timeStart: "TIME START",
  timeEnd: "TIME END",
  tempCheck: "TRUCK TEMPERATURE",

  // NEW labels
  trafficControlSpotter: "TRAFFIC CONTROL / SPOTTER USED",
  vehicleSecured: "VEHICLE SECURED (HANDBRAKE + CHOCKS)",
  loadSecured: "LOAD SECURED (STRAPS + INSPECTION)",
  areaSafe: "AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR)",
  manualHandlingControls: "MANUAL HANDLING CONTROLS APPLIED",

  // Existing labels
  floorSealingIntact: "FLOOR SEALING INTACT",
  floorCleaning: "FLOOR CLEANING",
  pestActivites: "PEST ACTIVITES",
  plasticCurtain: "PLASTIC CURTAIN AVAILABLE/ CLEANING",
  badOdour: "BAD ODOUR",
  ppeAvailable: "PPE AVAILABLE",
};

/* Cream cakes and dairy desserts travel chilled: the truck must be ≤ 5 °C. */
export const TEMP_LIMIT_C = 5;

export const tempTooHigh = (v) => String(v ?? "").trim() !== "" && Number(v) > TEMP_LIMIT_C;

export const TEMP_HOT = { borderColor: "#dc2626", background: "#fef2f2", color: "#b91c1c", fontWeight: 900 };

export const HEAD_DEFAULT = {
  documentTitle: "OUTBOUND CHECKLIST",
  documentNo: "SW-LOG-OCL-01",
  issueDate: "",
  revisionNo: "0",
  area: "LOGISTICS",
  issuedBy: "",
  controllingOfficer: "LOGISTICS SUPERVISOR",
  approvedBy: "",
};

// Default row
export function newRow() {
  return {
    vehicleNo: "",
    driverName: "",
    destination: "",
    timeStart: "",
    timeEnd: "",
    tempCheck: "",

    // NEW safety controls (defaults)
    trafficControlSpotter: "yes",
    vehicleSecured: "yes",
    loadSecured: "yes",
    areaSafe: "yes",
    manualHandlingControls: "yes",

    // Existing
    floorSealingIntact: "yes",
    floorCleaning: "yes",
    pestActivites: "no",
    plasticCurtain: "yes",
    badOdour: "no",
    ppeAvailable: "yes",

    informedTo: "", // optional
    remarks: "",
  };
}

export function normKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

export function uniqueSorted(values) {
  const seen = new Set();
  const out = [];
  values
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .forEach((v) => {
      const k = normKey(v);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(v);
      }
    });
  out.sort((a, b) => a.localeCompare(b));
  return out;
}
