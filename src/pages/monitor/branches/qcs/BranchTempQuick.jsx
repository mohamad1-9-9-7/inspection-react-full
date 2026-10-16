// src/pages/monitor/branches/qcs/BranchTempQuick.jsx
//
// 📱 Branch temperature quick entry (QR sticker on each unit) for the branch
// temperature sheets:
//   /monitor/branch-temp/:branch            hub     (pos10 | pos11 | pos15 | pos19)
//   /monitor/branch-temp/:branch/:unit      one unit — the unit is its NAME
//
// Same screen as QCS (_shared/QuickTempPage); this file is the adapter for
// the branch records. Readings go through POST /api/reports/branch-temp/reading
// and land in the day's record of the branch sheet itself, so the sheet,
// its View page and its exports all show them.
//
// Units are the rows of today's record, or of the newest record, or the
// sheet's default rows. Limits are the ones printed on the sheets:
//   POS 10/11/15 — chiller ≤ 5°C · freezer -25…-12°C · preparation ≤ 10°C · loading ≤ 16°C
//   POS 19       — chiller ≤ 5°C · freezer ≤ -18°C · ambient ≤ 25°C

import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import QuickTempPage from "../_shared/QuickTempPage";
import { emojiOf } from "./coolerDefs";
import { saveReadingWith, uaeMinutes } from "./coolerQuick";
import { getLatestReport, getReportRowByDate, payloadOf } from "../_shared/reportApi";
import { BRANCH_READING_KIND, postBranchReading } from "../../../../utils/reportOutbox";
import { buildPublicUrl } from "../../../../config/publicOrigin";
import { canReport } from "../../../../utils/reportPerms";

export const BRANCH_TEMP_PATH = "/monitor/branch-temp";

const hm = (s) => {
  const m = String(s).match(/^(\d{1,2}):00 (AM|PM)$/);
  if (!m) return 0;
  const h = Number(m[1]) % 12;
  return m[2] === "PM" ? h + 12 : h;
};
const gridSlots = (labels) =>
  labels.map((label) => ({ key: label, label, short: label.replace(":00 ", "").toLowerCase(), hour: hm(label) }));

/* Upper-bound-only limits keep min far below any real reading. */
const NO_MIN = -60;
const def = (label, type, min, max) => ({ label, type, min, max });

function gridDef(name) {
  const n = String(name || "").toLowerCase();
  if (/freez/.test(n)) return def(name, "frozen", -25, -12);
  if (/production|prep/.test(n)) return def(name, "production", NO_MIN, 10);
  if (/loading/.test(n)) return def(name, "ambient", NO_MIN, 16);
  return def(name, "chilled", NO_MIN, 5);
}
function pos19Def(name, unitType) {
  if (unitType === "freezer") return def(name, "frozen", NO_MIN, -18);
  if (unitType === "ambient") return def(name, "dry", NO_MIN, 25);
  return def(name, "chilled", NO_MIN, 5);
}

export const BRANCH_TEMP = {
  pos10: {
    branch: "POS 10", type: "pos10_temperature", reportId: "temperature", shape: "grid", sheet: "/monitor/pos10?tab=temperature",
    slots: gridSlots(["8:00 AM", "11:00 AM", "2:00 PM", "5:00 PM", "8:00 PM", "10:00 PM"]),
    defaults: ["Display Chiller 1", "Display Chiller 2", "Display Chiller 3", "Display Chiller 4", "Cheese Chiller",
      "Freezer 1", "Freezer 2", "Freezer 3", "Storage Chiller", "Production Room"],
  },
  pos11: {
    branch: "POS 11", type: "pos11_temperature", reportId: "temperature", shape: "grid", sheet: "/monitor/pos11?tab=temperature",
    slots: gridSlots(["8:00 AM", "12:00 PM", "4:00 PM", "8:00 PM"]),
    defaults: ["Display Chiller 1", "Display Chiller 2", "Display Chiller 3", "Vertical Display Chiller", "Dairy Chiller",
      "Production Room", "Storage Chiller", "Horizontal Freezer", "Display Freezer"],
  },
  pos15: {
    branch: "POS 15", type: "pos15_temperature", reportId: "temperature", shape: "grid", sheet: "/monitor/pos15?tab=temperature",
    slots: gridSlots(["8:00 AM", "11:00 AM", "2:00 PM", "5:00 PM", "8:00 PM", "10:00 PM"]),
    defaults: ["Cooler 1", "Cooler 2", "Cooler 3", "Cooler 4", "Cooler 5", "Cooler 6", "Cooler 7", "Freezer 1", "Freezer 2"],
  },
  pos19: {
    branch: "POS 19", type: "pos19_temperature_monitoring", reportId: "temperatureMonitoring", shape: "pos19",
    sheet: "/monitor/pos19?tab=temperatureMonitoring",
    slots: [
      { key: "am", label: "Morning", short: "am", hour: 8 },
      { key: "pm", label: "Midday", short: "mid", hour: 13 },
      { key: "ev", label: "Evening", short: "eve", hour: 19 },
    ],
    defaults: [],
  },
};

const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/** Rows of a record as [{ name, unitType? }]. */
function rowsOf(cfg, payload) {
  if (!payload) return [];
  if (cfg.shape === "grid") {
    return (Array.isArray(payload.coolers) ? payload.coolers : [])
      .map((c) => ({ name: String(c?.name || "").trim() })).filter((r) => r.name);
  }
  return (Array.isArray(payload.entries) ? payload.entries : [])
    .map((e) => ({ name: String(e?.equipment || "").trim(), unitType: e?.unitType || "chiller" })).filter((r) => r.name);
}

function rowOf(cfg, payload, name) {
  if (!payload) return null;
  const list = cfg.shape === "grid" ? payload.coolers : payload.entries;
  return (Array.isArray(list) ? list : []).find((r) => sameName(cfg.shape === "grid" ? r?.name : r?.equipment, name)) || null;
}

/** "08:05" in UAE time — POS 19 keeps the time of each reading next to it. */
function uaeHM(d = new Date()) {
  const m = uaeMinutes(d);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function makeAdapter(code) {
  const cfg = BRANCH_TEMP[code];
  if (!cfg) return null;
  const defOf = (row) => (cfg.shape === "grid" ? gridDef(row.name) : pos19Def(row.name, row.unitType));
  return {
    label: cfg.branch,
    type: cfg.type,
    printTitle: cfg.branch,
    hubPath: `${BRANCH_TEMP_PATH}/${code}`,
    sheetPath: cfg.sheet,
    allowed: () => canReport(cfg.branch, cfg.reportId, "input"),
    slots: cfg.slots,
    slotForNow(now) {
      const mins = uaeMinutes(now);
      let best = cfg.slots[0].key;
      let bestDiff = Infinity;
      cfg.slots.forEach((sl) => {
        const diff = Math.abs(sl.hour * 60 - mins);
        if (diff < bestDiff) { bestDiff = diff; best = sl.key; }
      });
      return best;
    },
    async load(date) {
      const row = await getReportRowByDate(cfg.type, date);
      const payload = row ? payloadOf(row) : null;
      let rows = rowsOf(cfg, payload);
      if (!rows.length) {
        const last = await getLatestReport(cfg.type).catch(() => null);
        rows = rowsOf(cfg, last ? payloadOf(last) || last.payload : null);
      }
      if (!rows.length) rows = cfg.defaults.map((name) => ({ name }));
      return { payload, units: rows.map((r) => ({ key: r.name, def: defOf(r), unitType: r.unitType })), extra: { rows } };
    },
    readingsOf(payload, key) {
      const r = rowOf(cfg, payload, key);
      if (!r) return {};
      if (cfg.shape === "grid") return r.temps || {};
      return { am: r.am_temp, pm: r.pm_temp, ev: r.ev_temp };
    },
    remarksOf(payload, key) {
      const r = rowOf(cfg, payload, key);
      return (cfg.shape === "grid" ? r?.remarks : r?.correctiveAction) || "";
    },
    namesOf: (payload) => rowsOf(cfg, payload).map((r) => r.name),
    defOf: (key, payload) => defOf(rowsOf(cfg, payload).find((r) => sameName(r.name, key)) || { name: key }),
    sameUnit: sameName,
    inRange: (d, v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= d.min && n <= d.max;
    },
    emoji: (d) => emojiOf({ type: d.type }),
    rangeLabel: (d) => (d.min <= NO_MIN ? `≤ ${d.max}°C` : `${d.min}°C to ${d.max}°C`),
    qrUrl: (key) => buildPublicUrl(`${BRANCH_TEMP_PATH}/${code}/${encodeURIComponent(key)}`),
    save(common, data) {
      const rows = data?.extra?.rows || [];
      const me = rows.find((r) => sameName(r.name, common.unit));
      return saveReadingWith(postBranchReading, BRANCH_READING_KIND, {
        ...common,
        type: cfg.type,
        unitType: me?.unitType || "",
        timeHM: uaeHM(new Date(common.at)),
        // Seeds the rows when this reading creates the day's record.
        units: rows.map((r) => r.name),
      });
    },
  };
}

export default function BranchTempQuick() {
  const { branch, unit } = useParams();
  const code = String(branch || "").toLowerCase();
  const A = useMemo(() => makeAdapter(code), [code]);
  if (!A) return <div style={{ padding: 30, fontWeight: 700 }}>Unknown branch.</div>;
  // React Router already decodes the unit name from the URL.
  return <QuickTempPage A={A} unit={unit || undefined} />;
}
