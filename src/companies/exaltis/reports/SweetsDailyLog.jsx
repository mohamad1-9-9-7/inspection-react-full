// src/companies/exaltis/reports/SweetsDailyLog.jsx
// One engine for every schema-driven sweets daily log (dailyLogSchemas.js):
// the entry sheet, the saved-sheets browser and the read-only sheet with the
// standard toolbar (Edit · Excel · PDF · Print · Delete from _sweetsReportKit).
//
// One sheet per (type, day): the server enforces a unique reportDate per type,
// so picking a date that already has a sheet re-opens it and the save updates
// it by id (PUT /api/reports/:id) instead of creating a duplicate.
//
// The shell renders report pages without props, so index.js asks for a
// ready-made component through inputFor(type) / viewFor(type).

import React from "react";
import { schemaByType } from "./dailyLogSchemas";
import { LogForm } from "./dailyLog/LogForm";
import { LogBrowser } from "./dailyLog/LogBrowser";

/* ═════════════════════════ factories for index.js ═════════════════════════ */
const cache = new Map();
function make(kind, type) {
  const key = `${kind}:${type}`;
  if (!cache.has(key)) {
    const schema = schemaByType(type);
    const Comp = kind === "input"
      ? function SweetsLogInput() { return <LogForm schema={schema} />; }
      : function SweetsLogView() { return <LogBrowser schema={schema} />; };
    cache.set(key, Comp);
  }
  return cache.get(key);
}
export const inputFor = (type) => make("input", type);
export const viewFor = (type) => make("view", type);
